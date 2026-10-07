-- ========================================================
-- 06_figma_campuscare_features.sql
-- CampusCare Figma Design Alignments:
-- 1. Human-readable reference codes (#CC-1001)
-- 2. Multi-image attachment support (up to 4 images)
-- 3. Assigned Team / Department field
-- 4. Duplicate prevention RPC ("Similar Issues Nearby")
-- 5. Unified Activity Stream RPC (merges status history & chat)
-- 6. In-app notifications table & automated trigger
-- 7. Trending feed performance indexing
-- ========================================================

-- 1. HUMAN-READABLE REFERENCE CODE SEQUENCE & COLUMN
create sequence if not exists complaint_ref_seq start with 1001;

alter table public.complaints 
  add column if not exists reference_code text unique 
  default ('CC-' || nextval('complaint_ref_seq')::text);

-- Backfill any existing complaints without a reference code
update public.complaints 
set reference_code = 'CC-' || nextval('complaint_ref_seq')::text
where reference_code is null;

-- Make reference_code not null
alter table public.complaints 
  alter column reference_code set not null;

create index if not exists idx_complaints_reference_code 
  on public.complaints(reference_code);

-- 2. MULTI-IMAGE ATTACHMENT SUPPORT (UP TO 4 PHOTOS)
alter table public.complaints 
  add column if not exists image_urls text[] default '{}'::text[];

-- Automatically synchronize image_url (cover photo) with first item of image_urls if provided
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

-- 3. ASSIGNED TEAM / DEPARTMENT FIELD
alter table public.complaints 
  add column if not exists assigned_team text;

-- Add check constraint for standard campus maintenance departments
alter table public.complaints 
  drop constraint if exists complaints_assigned_team_check;

alter table public.complaints 
  add constraint complaints_assigned_team_check 
  check (
    assigned_team is null or assigned_team in (
      'Facilities',
      'Electrical',
      'Plumbing',
      'HVAC / Cooling',
      'IT & Network',
      'Janitorial',
      'Carpentry',
      'General Maintenance'
    )
  );

create index if not exists idx_complaints_assigned_team 
  on public.complaints(assigned_team);

-- 4. "SIMILAR ISSUES NEARBY" / DUPLICATE DETECTION RPC
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

-- 5. UNIFIED ACTIVITY STREAM RPC
-- Blends status history logs and two-way chat messages into a single chronological feed
create or replace function public.get_complaint_activity_stream(p_complaint_id uuid)
returns json
language plpgsql stable set search_path = public as $$
declare
  result json;
begin
  with unified_feed as (
    -- Status change events from status_history
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

    -- Discussion messages from complaint_comments
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

-- 6. IN-APP NOTIFICATIONS TABLE & AUTOMATED TRIGGER
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id, is_read, created_at desc);

-- RLS on notifications
alter table public.notifications enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications
  for update using (user_id = auth.uid());

-- Trigger: Notify student whenever complaint status or assigned team changes
create or replace function public.notify_student_on_complaint_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ref_text text;
  notif_title text;
  notif_msg text;
begin
  ref_text := coalesce(new.reference_code, 'your complaint');

  -- Case 1: Status changed
  if (old.status is distinct from new.status) then
    notif_title := 'Status Updated: ' || ref_text;
    notif_msg := 'Your report has moved to ' || new.status || '.';
    if (new.admin_note is not null and new.admin_note != '') then
      notif_msg := notif_msg || ' Note: ' || new.admin_note;
    end if;

    insert into public.notifications (user_id, complaint_id, title, message)
    values (new.user_id, new.id, notif_title, notif_msg);

  -- Case 2: Team assigned
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

-- 7. TRENDING FEED INDEXING
-- Fast ranking by student support and status
create index if not exists idx_complaints_trending 
  on public.complaints(status, upvotes_count desc, created_at desc);

-- 8. REALTIME PUBLICATION
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when others then
  null;
end $$;
