-- ========================================================
-- CAMPUS PROBLEM REPORTING SYSTEM - MASTER DATABASE SCHEMA
-- Version 2.0 (Includes Upvotes, Comments, Locations & Self-Resolution)
-- Run this in your Supabase SQL Editor
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

-- 2. STANDARDIZED CAMPUS LOCATIONS TABLE
create table if not exists public.campus_locations (
  id uuid primary key default gen_random_uuid(),
  building text not null,
  floor text not null,
  room text not null,
  created_at timestamptz not null default now(),
  constraint unique_building_floor_room unique (building, floor, room)
);

create index if not exists idx_campus_locations_building on public.campus_locations(building);

-- 3. COMPLAINTS TABLE
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null check (category in
    ('Lighting','Furniture','Water Leakage','Cleanliness','Equipment','Network')),
  location text not null,
  location_id uuid references public.campus_locations(id) on delete set null,
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

create index if not exists idx_complaints_user_id on public.complaints(user_id);
create index if not exists idx_complaints_status on public.complaints(status);
create index if not exists idx_complaints_created_at on public.complaints(created_at desc);

-- 4. UPVOTES TABLE ("I Have This Problem Too")
create table if not exists public.complaint_upvotes (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint unique_complaint_user_upvote unique (complaint_id, user_id)
);

create index if not exists idx_complaint_upvotes_complaint_id on public.complaint_upvotes(complaint_id);
create index if not exists idx_complaint_upvotes_user_id on public.complaint_upvotes(user_id);

-- Trigger: automatically synchronize upvotes_count on complaints
create or replace function public.sync_complaint_upvotes_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target_id uuid;
begin
  if (tg_op = 'INSERT') then
    target_id := new.complaint_id;
  else
    target_id := old.complaint_id;
  end if;

  update public.complaints
  set upvotes_count = (
    select count(*) 
    from public.complaint_upvotes 
    where complaint_id = target_id
  )
  where id = target_id;

  return null;
end; $$;

drop trigger if exists trg_sync_complaint_upvotes on public.complaint_upvotes;
create trigger trg_sync_complaint_upvotes
after insert or delete on public.complaint_upvotes
for each row execute function public.sync_complaint_upvotes_count();

-- 5. TWO-WAY COMMENTS THREAD
create table if not exists public.complaint_comments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (length(trim(message)) > 0),
  is_official boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_complaint_comments_complaint_id 
  on public.complaint_comments(complaint_id, created_at asc);

-- Trigger: auto-tag official admin comments
create or replace function public.tag_comment_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  sender_role text;
begin
  select role into sender_role from public.profiles where id = new.user_id;
  if sender_role = 'admin' then
    new.is_official := true;
  else
    new.is_official := false;
  end if;
  return new;
end; $$;

drop trigger if exists trg_tag_comment_role on public.complaint_comments;
create trigger trg_tag_comment_role
before insert on public.complaint_comments
for each row execute function public.tag_comment_role();

-- 6. STATUS HISTORY TABLE
create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  status text not null,
  note text,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_status_history_complaint_id 
  on public.status_history(complaint_id, changed_at asc);

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

-- 7. CONVENIENCE RPC FUNCTIONS

-- Toggle Upvote RPC
create or replace function public.toggle_complaint_upvote(target_complaint_id uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid();
  already_upvoted boolean;
  new_count integer;
  result_status text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select exists (
    select 1 from public.complaint_upvotes 
    where complaint_id = target_complaint_id and user_id = current_user_id
  ) into already_upvoted;

  if already_upvoted then
    delete from public.complaint_upvotes 
    where complaint_id = target_complaint_id and user_id = current_user_id;
    result_status := 'removed';
  else
    insert into public.complaint_upvotes (complaint_id, user_id)
    values (target_complaint_id, current_user_id);
    result_status := 'added';
  end if;

  select upvotes_count into new_count 
  from public.complaints 
  where id = target_complaint_id;

  return json_build_object(
    'action', result_status,
    'upvoted', (result_status = 'added'),
    'upvotes_count', coalesce(new_count, 0)
  );
end; $$;

-- Withdraw Complaint RPC
create or replace function public.withdraw_my_complaint(
  target_complaint_id uuid,
  reason text default 'Withdrawn by student'
)
returns json
language plpgsql security definer set search_path = public as $$
declare
  complaint_record public.complaints%rowtype;
begin
  select * into complaint_record 
  from public.complaints 
  where id = target_complaint_id and user_id = auth.uid();

  if not found then
    raise exception 'Complaint not found or you are not authorized to withdraw it';
  end if;

  if complaint_record.status in ('Resolved', 'Withdrawn') then
    raise exception 'Cannot withdraw a complaint that is already %', complaint_record.status;
  end if;

  update public.complaints
  set status = 'Withdrawn',
      admin_note = coalesce(reason, 'Withdrawn by student'),
      updated_at = now()
  where id = target_complaint_id;

  return json_build_object(
    'success', true,
    'id', target_complaint_id,
    'status', 'Withdrawn'
  );
end; $$;

-- Self-Resolve Complaint RPC
create or replace function public.self_resolve_my_complaint(
  target_complaint_id uuid,
  remark text default 'Resolved on-site by student'
)
returns json
language plpgsql security definer set search_path = public as $$
declare
  complaint_record public.complaints%rowtype;
begin
  select * into complaint_record 
  from public.complaints 
  where id = target_complaint_id and user_id = auth.uid();

  if not found then
    raise exception 'Complaint not found or you are not authorized to resolve it';
  end if;

  update public.complaints
  set status = 'Resolved',
      admin_note = coalesce(remark, 'Resolved on-site by student'),
      updated_at = now()
  where id = target_complaint_id;

  return json_build_object(
    'success', true,
    'id', target_complaint_id,
    'status', 'Resolved'
  );
end; $$;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.complaint_upvotes enable row level security;
alter table public.complaint_comments enable row level security;
alter table public.campus_locations enable row level security;
alter table public.status_history enable row level security;

-- Profiles
drop policy if exists "authenticated read profiles" on public.profiles;
create policy "authenticated read profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Campus Locations
drop policy if exists "authenticated read locations" on public.campus_locations;
create policy "authenticated read locations" on public.campus_locations
  for select using (auth.role() = 'authenticated');

drop policy if exists "admins manage locations" on public.campus_locations;
create policy "admins manage locations" on public.campus_locations
  for all using (public.is_admin());

-- Complaints
drop policy if exists "authenticated read complaints" on public.complaints;
create policy "authenticated read complaints" on public.complaints
  for select using (auth.role() = 'authenticated');

drop policy if exists "students insert own" on public.complaints;
create policy "students insert own" on public.complaints
  for insert with check (user_id = auth.uid());

drop policy if exists "admins update" on public.complaints;
create policy "admins update" on public.complaints
  for update using (public.is_admin());

drop policy if exists "students update own status" on public.complaints;
create policy "students update own status" on public.complaints
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and status in ('Resolved', 'Withdrawn'));

-- Upvotes
drop policy if exists "authenticated read upvotes" on public.complaint_upvotes;
create policy "authenticated read upvotes" on public.complaint_upvotes
  for select using (auth.role() = 'authenticated');

drop policy if exists "users insert own upvote" on public.complaint_upvotes;
create policy "users insert own upvote" on public.complaint_upvotes
  for insert with check (user_id = auth.uid());

drop policy if exists "users delete own upvote" on public.complaint_upvotes;
create policy "users delete own upvote" on public.complaint_upvotes
  for delete using (user_id = auth.uid());

-- Comments
drop policy if exists "authenticated read comments" on public.complaint_comments;
create policy "authenticated read comments" on public.complaint_comments
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated insert own comment" on public.complaint_comments;
create policy "authenticated insert own comment" on public.complaint_comments
  for insert with check (user_id = auth.uid());

drop policy if exists "authors or admin delete comment" on public.complaint_comments;
create policy "authors or admin delete comment" on public.complaint_comments
  for delete using (user_id = auth.uid() or public.is_admin());

-- Status History
drop policy if exists "authenticated read status history" on public.status_history;
create policy "authenticated read status history" on public.status_history
  for select using (auth.role() = 'authenticated');

-- 9. STORAGE BUCKET
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

-- 10. REALTIME PUBLICATIONS
do $$
begin
  alter publication supabase_realtime add table public.complaints;
  alter publication supabase_realtime add table public.complaint_comments;
exception when others then
  null;
end $$;
