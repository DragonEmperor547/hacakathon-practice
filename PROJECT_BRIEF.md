# Campus Problem Reporting System — Project Brief

> Read this whole file before writing any code. It is the source of truth for the project.
> Hackathon: 4 hours total, team of 2, shared Git repository. Speed and a working demo matter most.

## 1. Problem

Students run into problems around campus: broken lights, damaged furniture, water leakage, dirty areas,
malfunctioning equipment, network issues. Reporting them is inconvenient, and students never know whether
their complaint was actually addressed.

**Goal:** an app where students report campus problems and track their resolution, and where administrators
review, prioritize and update them.

## 2. Minimum requirements (must all work)

**Student can:**
- Sign up / log in
- Submit a complaint
- Select a category
- Provide a description
- Specify a location
- Attach an image
- View their submitted complaints
- Track the status of each complaint

**Admin can:**
- View all complaints
- Change a complaint's status
- Prioritize complaints (set priority)

The deliverable must run as a **web application** (deployed with a live link). Mobile support is a bonus.

## 3. Tech stack (decided)

| Layer | Choice |
|---|---|
| App | **React Native with Expo** (Expo Router, TypeScript), run and deployed as a **web build** and also usable on phones via Expo Go |
| Backend | **Supabase** (Postgres database, Auth, Storage, Row Level Security). No custom server. |
| Web deployment | Vercel (static export of the Expo web build) |
| Styling | Plain React Native `StyleSheet` with a shared theme file (keep it simple) |
| Image picking | `expo-image-picker` |

### React Native + web rules (important)
- The **web build is the primary demo target**. Test in the browser constantly (`npx expo start --web`).
- `Alert.alert` does nothing on web. Use inline error/success messages or a small toast component instead.
- Use `FlatList` with responsive card layouts for lists. Do not build HTML tables.
- Keep the layout centered with a max width (about 900px) on wide screens so it looks good on desktop.
- Avoid libraries with native-only modules. If a package doesn't support web, don't use it.
- For dropdowns (status, priority, category), use simple pressable chip/segmented selectors. They work identically on web and native.

## 4. Roles and workflow

- **Two roles:** `student` and `admin`, stored in `profiles.role`.
- New sign-ups are always `student`. Admins are promoted manually in the Supabase SQL editor.
- After login, redirect by role: students to the student area, admins to the admin area.
- Statuses: `Pending` → `In Progress` → `Resolved` (or `Rejected`).
- Priorities: `Low`, `Medium`, `High`, `Urgent`.
- Categories: `Lighting`, `Furniture`, `Water Leakage`, `Cleanliness`, `Equipment`, `Network`.

## 5. Database schema (run in Supabase SQL editor)

```sql
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- COMPLAINTS
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null check (category in
    ('Lighting','Furniture','Water Leakage','Cleanliness','Equipment','Network')),
  location text not null,
  image_url text,
  status text not null default 'Pending'
    check (status in ('Pending','In Progress','Resolved','Rejected')),
  priority text not null default 'Medium'
    check (priority in ('Low','Medium','High','Urgent')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- STATUS HISTORY (powers the tracking timeline)
create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  status text not null,
  note text,
  changed_at timestamptz not null default now()
);

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create trigger complaints_touch before update on public.complaints
for each row execute function public.touch_updated_at();

create function public.log_status_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.status_history (complaint_id, status) values (new.id, new.status);
  elsif new.status is distinct from old.status then
    insert into public.status_history (complaint_id, status, note)
    values (new.id, new.status, new.admin_note);
  end if;
  return null;
end; $$;

create trigger complaints_history after insert or update on public.complaints
for each row execute function public.log_status_after();

-- ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.status_history enable row level security;

create policy "read own profile or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "students read own, admins read all" on public.complaints
  for select using (user_id = auth.uid() or public.is_admin());
create policy "students insert own" on public.complaints
  for insert with check (user_id = auth.uid());
create policy "admins update" on public.complaints
  for update using (public.is_admin());

create policy "read history of visible complaints" on public.status_history
  for select using (
    exists (select 1 from public.complaints c
            where c.id = complaint_id and (c.user_id = auth.uid() or public.is_admin()))
  );

-- STORAGE (public-read bucket for complaint images)
insert into storage.buckets (id, name, public) values ('complaint-images','complaint-images', true);
create policy "auth upload images" on storage.objects
  for insert to authenticated with check (bucket_id = 'complaint-images');
create policy "public read images" on storage.objects
  for select using (bucket_id = 'complaint-images');

-- PROMOTE AN ADMIN (run manually after that person has signed up)
-- update public.profiles set role = 'admin' where id = '<user-uuid>';
```

> Note for the agent: if any SQL above errors in Supabase, fix it minimally and tell the user what changed.
> Do not weaken the RLS rules to make something work.

## 6. Environment variables

Create `.env` (never commit it) and commit `.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Supabase client (`lib/supabase.ts`) must use `react-native-url-polyfill/auto`, `AsyncStorage` for session
storage, `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`.

## 7. Suggested folder structure

```
app/
  _layout.tsx                 # auth provider, role-based redirect
  (auth)/login.tsx
  (auth)/signup.tsx
  (student)/index.tsx         # My complaints (list + status badges)
  (student)/report.tsx        # Report a problem form
  (student)/complaint/[id].tsx# Detail + status timeline
  (admin)/index.tsx           # Dashboard: counts, filters, complaint list
  (admin)/complaint/[id].tsx  # Detail: change status, set priority, add note
components/                   # StatusBadge, PriorityBadge, ComplaintCard, Button, Input, Chips...
lib/supabase.ts
lib/api.ts                    # all Supabase queries in one place
constants/theme.ts            # colors, spacing, status/priority colors
types/index.ts
```

## 8. Screens and behavior

1. **Login / Sign up.** Email + password + full name on sign up. Show errors inline.
2. **Report a problem (student).** Title, category (chips), description, location (text, e.g. "Block B, Room 204"),
   optional photo (camera or gallery). Validate required fields. On submit: upload image to the
   `complaint-images` bucket (`<user_id>/<timestamp>.jpg`), then insert the complaint with the public image URL.
   Show a success state and navigate to My complaints.
3. **My complaints (student).** List newest first. Each card: title, category, location, status badge, date.
   Pull to refresh.
4. **Complaint detail (student).** Full info, image, priority, admin note, and a **status timeline** built from
   `status_history`.
5. **Admin dashboard.** Count cards (Pending / In Progress / Resolved). Filter by status, category and priority.
   Sort urgent first. List of all complaints with badges.
6. **Admin complaint detail.** Show everything, including the reporter's name. Controls to change status, set
   priority, and add an admin note. Save updates the row (history is logged automatically by the trigger).

### Image upload (cross-platform approach)
Use `expo-image-picker` with `base64: true`, convert with `decode` from `base64-arraybuffer`, and upload the
ArrayBuffer with `contentType: 'image/jpeg'`. This works on both web and native.

### Status colors (consistent everywhere)
Pending = grey, In Progress = amber, Resolved = green, Rejected = red.
Priority: Low = blue-grey, Medium = blue, High = orange, Urgent = red.

## 9. Build order and time budget (4 hours)

| Time | Goal |
|---|---|
| 0:00-0:30 | Repo scaffold, Expo + Supabase set up, tables and bucket created, wireframes done, Vercel connected |
| 0:30-1:00 | Auth, roles, role-based redirect, basic layout and shared components |
| 1:00-2:15 | Student flow and admin flow built in parallel until the full loop works: submit → list → change status |
| 2:15-2:45 | Integration, RLS and role bug fixes, test as student and as admin |
| 2:45-3:30 | Polish: timeline, filters, priority sorting, empty/loading states, responsive web layout |
| 3:30-3:50 | Seed realistic demo data, test on phone and desktop, fix worst bugs |
| 3:50-4:00 | Final deploy, README, rehearse demo |


## 11. Git rules

- `main` must always run. Work on feature branches (`feat/student-form`, `feat/admin-dashboard`).
- Small commits, merge to `main` roughly every 30-45 minutes, pull `main` before starting a new chunk.
- Never commit `.env` or Supabase secret/service-role keys. Only the anon key belongs in the app.
- Don't both edit the same file at once. Split by feature folder.

## 12. Instructions for the AI agent

- Work in **small, well-scoped tasks**. Confirm each one runs before moving on.
- Follow this brief's schema, folder structure and naming. Don't invent new tables or change the stack without asking.
- Keep all Supabase calls in `lib/api.ts`.
- Use TypeScript types from `types/index.ts`.
- Test on **web** after every feature.
- Keep code simple and readable. No over-engineering, no unused dependencies.
- Handle loading, empty and error states on every screen.
- Prefer finishing the minimum requirements before any extras.

## 13. Extras (only after every minimum requirement works)

- "I have this problem too" button with a count, to help admins spot duplicates
- Search box on the admin list
- Admin dashboard summary by category
- Camera capture shortcut on phones
- Nicer empty states and small animations

## 14. Definition of done

- A student can sign up, submit a complaint with category, description, location and image, and see it in their list
- A student can open a complaint and see its current status and timeline
- An admin can see all complaints, change status, and set priority; the student sees the update
- Deployed web link works; README explains the project, stack and how to run it
- Demo data and two ready accounts (one student, one admin) exist
