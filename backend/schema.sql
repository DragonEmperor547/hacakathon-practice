-- ========================================================
-- CAMPUSCARE / CAMPUS PROBLEM REPORTING SYSTEM - MASTER DATABASE SCHEMA
-- Version 2.1 (Full Figma Design & Feature Parity)
-- Run this in your Supabase SQL Editor
-- ========================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- SEQUENCE FOR HUMAN-READABLE REFERENCE CODES (#CC-1001)
create sequence if not exists complaint_ref_seq start with 1001;

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
  reference_code text unique not null default ('CC-' || nextval('complaint_ref_seq')::text),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null check (category in
    ('Lighting','Furniture','Water Leakage','Cleanliness','Equipment','Network')),
  location text not null,
  location_id uuid references public.campus_locations(id) on delete set null,
  image_url text,
  image_urls text[] default '{}'::text[],
  status text not null default 'Pending'
    check (status in ('Pending','In Progress','Resolved','Rejected','Withdrawn')),
  priority text not null default 'Medium'
    check (priority in ('Low','Medium','High','Urgent')),
  assigned_team text check (
    assigned_team is null or assigned_team in (
      'Facilities', 'Electrical', 'Plumbing', 'HVAC / Cooling',
      'IT & Network', 'Janitorial', 'Carpentry', 'General Maintenance'
    )
  ),
  admin_note text,
  upvotes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_complaints_user_id on public.complaints(user_id);
create index if not exists idx_complaints_status on public.complaints(status);
create index if not exists idx_complaints_created_at on public.complaints(created_at desc);
create index if not exists idx_complaints_reference_code on public.complaints(reference_code);
create index if not exists idx_complaints_trending on public.complaints(status, upvotes_count desc, created_at desc);

-- Trigger: keep image_url (cover) and image_urls in sync
create or replace function public.sync_complaint_image_urls() returns trigger
language plpgsql as $$
begin
  if (new.image_urls is not null and array_length(new.image_urls, 1) > 0) then
    if (new.image_url is null or new.image_url = '') then
      new.image_url := new.image_urls[1];
    end if;
  elsif (new.image_url is not null and new.image_url != '') then
    if (new.image_urls is null or array_length(new.image_urls, 1) is null) then
      new.image_urls := array[new.image_url];
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_sync_complaint_image_urls on public.complaints;
create trigger trg_sync_complaint_image_urls
before insert or update on public.complaints
for each row execute function public.sync_complaint_image_urls();

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

-- 7. IN-APP NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id 
  on public.notifications(user_id, is_read, created_at desc);

-- Trigger: notify student on status change or team assignment
create or replace function public.notify_student_on_complaint_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ref_text text;
  notif_title text;
  notif_msg text;
begin
  ref_text := coalesce(new.reference_code, 'your complaint');

  if (old.status is distinct from new.status) then
    notif_title := 'Status Updated: ' || ref_text;
    notif_msg := 'Your report has moved to ' || new.status || '.';
    if (new.admin_note is not null and new.admin_note != '') then
      notif_msg := notif_msg || ' Note: ' || new.admin_note;
    end if;

    insert into public.notifications (user_id, complaint_id, title, message)
    values (new.user_id, new.id, notif_title, notif_msg);

  elsif (old.assigned_team is distinct from new.assigned_team and new.assigned_team is not null) then
    notif_title := 'Team Assigned: ' || ref_text;
    notif_msg := 'The ' || new.assigned_team || ' department has been assigned to your issue.';

    insert into public.notifications (user_id, complaint_id, title, message)
    values (new.user_id, new.id, notif_title, notif_msg);
  end if;

  return new;
end; $$;

drop trigger if exists trg_notify_student on public.complaints;
create trigger trg_notify_student
after update on public.complaints
for each row execute function public.notify_student_on_complaint_update();

-- 8. CONVENIENCE RPC FUNCTIONS

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

-- Find Similar Complaints RPC (Duplicate Prevention)
create or replace function public.find_similar_complaints(
  p_category text,
  p_location text,
  p_exclude_id uuid default null
)
returns table (
  id uuid,
  reference_code text,
  title text,
  category text,
  location text,
  status text,
  priority text,
  image_url text,
  upvotes_count integer,
  created_at timestamptz
)
language sql stable set search_path = public as $$
  select 
    c.id,
    c.reference_code,
    c.title,
    c.category,
    c.location,
    c.status,
    c.priority,
    c.image_url,
    c.upvotes_count,
    c.created_at
  from public.complaints c
  where c.status in ('Pending', 'In Progress')
    and (
      c.category = p_category
      or (p_location is not null and length(trim(p_location)) > 2 and (
        c.location ilike '%' || trim(p_location) || '%'
        or trim(p_location) ilike '%' || c.location || '%'
      ))
    )
    and (p_exclude_id is null or c.id <> p_exclude_id)
  order by 
    (case when c.category = p_category then 2 else 0 end +
     case when p_location is not null and c.location ilike '%' || trim(p_location) || '%' then 3 else 0 end) desc,
    c.upvotes_count desc,
    c.created_at desc
  limit 5;
$$;

-- Unified Activity Stream RPC
create or replace function public.get_complaint_activity_stream(p_complaint_id uuid)
returns json
language plpgsql stable set search_path = public as $$
declare
  result json;
begin
  with unified_feed as (
    select 
      sh.id as item_id,
      sh.complaint_id,
      'status_change' as entry_type,
      sh.status as status_value,
      sh.note as message,
      null::boolean as is_official,
      sh.changed_by as user_id,
      p.full_name as author_name,
      p.role as author_role,
      p.avatar_url as author_avatar,
      sh.changed_at as created_at
    from public.status_history sh
    left join public.profiles p on p.id = sh.changed_by
    where sh.complaint_id = p_complaint_id

    union all

    select 
      cc.id as item_id,
      cc.complaint_id,
      'comment' as entry_type,
      null::text as status_value,
      cc.message as message,
      cc.is_official as is_official,
      cc.user_id as user_id,
      p.full_name as author_name,
      p.role as author_role,
      p.avatar_url as author_avatar,
      cc.created_at as created_at
    from public.complaint_comments cc
    left join public.profiles p on p.id = cc.user_id
    where cc.complaint_id = p_complaint_id
  )
  select coalesce(
    json_agg(
      json_build_object(
        'id', item_id,
        'entry_type', entry_type,
        'status', status_value,
        'message', message,
        'is_official', coalesce(is_official, author_role = 'admin'),
        'user_id', user_id,
        'author', json_build_object(
          'id', user_id,
          'full_name', author_name,
          'role', author_role,
          'avatar_url', author_avatar
        ),
        'created_at', created_at
      )
      order by created_at asc
    ),
    '[]'::json
  ) into result
  from unified_feed;

  return result;
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

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.complaint_upvotes enable row level security;
alter table public.complaint_comments enable row level security;
alter table public.campus_locations enable row level security;
alter table public.status_history enable row level security;
alter table public.notifications enable row level security;

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

-- Notifications
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications
  for update using (user_id = auth.uid());

-- 10. STORAGE BUCKET
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

-- 11. REALTIME PUBLICATIONS
do $$
begin
  alter publication supabase_realtime add table public.complaints;
  alter publication supabase_realtime add table public.complaint_comments;
  alter publication supabase_realtime add table public.notifications;
exception when others then
  null;
end $$;
