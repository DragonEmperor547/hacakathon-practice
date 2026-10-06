-- ========================================================
-- CAMPUS PROBLEM REPORTING SYSTEM - DATABASE SCHEMA
-- Copy and run this entire file in your Supabase SQL Editor
-- ========================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

-- Trigger for auto-creating profile on user sign up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper function to check if user is admin
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 2. COMPLAINTS TABLE
create table if not exists public.complaints (
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

-- 3. STATUS HISTORY TABLE
create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  status text not null,
  note text,
  changed_at timestamptz not null default now()
);

-- Trigger to update complaints.updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists complaints_touch on public.complaints;
create trigger complaints_touch before update on public.complaints
for each row execute function public.touch_updated_at();

-- Trigger to log status changes into status_history
create or replace function public.log_status_after() returns trigger
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

drop trigger if exists complaints_history on public.complaints;
create trigger complaints_history after insert or update on public.complaints
for each row execute function public.log_status_after();

-- 4. ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.status_history enable row level security;

drop policy if exists "read own profile or admin" on public.profiles;
create policy "read own profile or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "students read own, admins read all" on public.complaints;
create policy "students read own, admins read all" on public.complaints
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "students insert own" on public.complaints;
create policy "students insert own" on public.complaints
  for insert with check (user_id = auth.uid());

drop policy if exists "admins update" on public.complaints;
create policy "admins update" on public.complaints
  for update using (public.is_admin());

drop policy if exists "read history of visible complaints" on public.status_history;
create policy "read history of visible complaints" on public.status_history
  for select using (
    exists (select 1 from public.complaints c
            where c.id = complaint_id and (c.user_id = auth.uid() or public.is_admin()))
  );

-- 5. STORAGE BUCKET FOR COMPLAINT IMAGES
insert into storage.buckets (id, name, public)
values ('complaint-images','complaint-images', true)
on conflict (id) do nothing;

drop policy if exists "auth upload images" on storage.objects;
create policy "auth upload images" on storage.objects
  for insert to authenticated with check (bucket_id = 'complaint-images');

drop policy if exists "auth update images" on storage.objects;
create policy "auth update images" on storage.objects
  for update to authenticated using (bucket_id = 'complaint-images');

drop policy if exists "public read images" on storage.objects;
create policy "public read images" on storage.objects
  for select using (bucket_id = 'complaint-images');

-- ========================================================
-- HOW TO PROMOTE AN ADMIN USER:
-- After a user signs up via the app, run the following line:
-- update public.profiles set role = 'admin' where id = '<user-uuid>';
-- ========================================================
