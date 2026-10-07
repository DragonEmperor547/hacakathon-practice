-- ========================================================
-- 02_upvotes_and_engagement.sql
-- "I Have This Problem Too" / Upvoting feature
-- Prevents duplicate reports and helps facility admins prioritize issues
-- ========================================================

-- 1. UPVOTES TABLE
create table if not exists public.complaint_upvotes (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint unique_complaint_user_upvote unique (complaint_id, user_id)
);

-- Index for fast lookup
create index if not exists idx_complaint_upvotes_complaint_id on public.complaint_upvotes(complaint_id);
create index if not exists idx_complaint_upvotes_user_id on public.complaint_upvotes(user_id);

-- Ensure upvotes_count column exists on complaints
alter table public.complaints 
  add column if not exists upvotes_count integer not null default 0;

-- 2. AUTOMATIC COUNTER TRIGGER
-- Updates complaints.upvotes_count whenever someone upvotes or removes an upvote
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

-- 3. ROW LEVEL SECURITY (RLS)
alter table public.complaint_upvotes enable row level security;

-- Any authenticated user can see who upvoted
drop policy if exists "authenticated read upvotes" on public.complaint_upvotes;
create policy "authenticated read upvotes" on public.complaint_upvotes
  for select using (auth.role() = 'authenticated');

-- Students can insert upvote for themselves
drop policy if exists "users insert own upvote" on public.complaint_upvotes;
create policy "users insert own upvote" on public.complaint_upvotes
  for insert with check (user_id = auth.uid());

-- Students can delete their own upvote (toggle off)
drop policy if exists "users delete own upvote" on public.complaint_upvotes;
create policy "users delete own upvote" on public.complaint_upvotes
  for delete using (user_id = auth.uid());

-- 4. ATOMIC TOGGLE RPC FUNCTION
-- Single call from frontend to toggle upvote on or off cleanly
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
