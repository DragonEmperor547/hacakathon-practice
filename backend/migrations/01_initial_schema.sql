-- ========================================================
-- 01_initial_schema.sql
-- Base tables: profiles, complaints, status_history, triggers, RLS & storage
-- ========================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Trigger: auto-create profile on auth sign up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Student User'))
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper function: is current user an admin?
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
    check (status in ('Pending','In Progress','Resolved','Rejected','Withdrawn')),
  priority text not null default 'Medium'
    check (priority in ('Low','Medium','High','Urgent')),
  admin_note text,
  upvotes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. STATUS HISTORY TABLE
create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  status text not null,
  note text,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

-- Trigger: update complaints.updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin 
  new.updated_at := now(); 
  return new; 
end; $$;

drop trigger if exists complaints_touch on public.complaints;
create trigger complaints_touch before update on public.complaints
for each row execute function public.touch_updated_at();

-- Trigger: log status changes into status_history
create or replace function public.log_status_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.status_history (complaint_id, status, note, changed_by)
    values (new.id, new.status, 'Complaint created', new.user_id);
  elsif new.status is distinct from old.status then
    insert into public.status_history (complaint_id, status, note, changed_by)
    values (new.id, new.status, new.admin_note, auth.uid());
  end if;
  return null;
end; $$;

drop trigger if exists complaints_history on public.complaints;
create trigger complaints_history after insert or update on public.complaints
for each row execute function public.log_status_after();

-- 4. ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.status_history enable row level security;

-- Profiles: Anyone authenticated can read profiles (needed to see reporter names)
drop policy if exists "read own profile or admin" on public.profiles;
drop policy if exists "authenticated read profiles" on public.profiles;
create policy "authenticated read profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Complaints: Students read own, admins read all (also all authenticated can read for community browsing)
drop policy if exists "students read own, admins read all" on public.complaints;
drop policy if exists "authenticated read complaints" on public.complaints;
create policy "authenticated read complaints" on public.complaints
  for select using (auth.role() = 'authenticated');

drop policy if exists "students insert own" on public.complaints;
create policy "students insert own" on public.complaints
  for insert with check (user_id = auth.uid());

drop policy if exists "admins update" on public.complaints;
create policy "admins update" on public.complaints
  for update using (public.is_admin());

-- Status history: readable by all authenticated users
drop policy if exists "read history of visible complaints" on public.status_history;
drop policy if exists "authenticated read status history" on public.status_history;
create policy "authenticated read status history" on public.status_history
  for select using (auth.role() = 'authenticated');

-- 5. STORAGE BUCKET
insert into storage.buckets (id, name, public)
values ('complaint-images','complaint-images', true)
on conflict (id) do nothing;

drop policy if exists "auth upload images" on storage.objects;
create policy "auth upload images" on storage.objects
  for insert to authenticated with check (bucket_id = 'complaint-images');

drop policy if exists "auth update images" on storage.objects;
create policy "auth update images" on storage.objects
  for update to authenticated using (
    bucket_id = 'complaint-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "public read images" on storage.objects;
create policy "public read images" on storage.objects
  for select using (bucket_id = 'complaint-images');
