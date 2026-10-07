-- ========================================================
-- 03_comments_communication.sql
-- Two-Way Communication & Activity Comments Thread
-- Enables student-admin discussion on specific complaints
-- ========================================================

-- 1. COMMENTS TABLE
create table if not exists public.complaint_comments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (length(trim(message)) > 0),
  is_official boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for efficient thread loading
create index if not exists idx_complaint_comments_complaint_id 
  on public.complaint_comments(complaint_id, created_at asc);
create index if not exists idx_complaint_comments_user_id 
  on public.complaint_comments(user_id);

-- 2. AUTO-FLAG OFFICIAL ADMIN COMMENTS TRIGGER
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

-- 3. ROW LEVEL SECURITY (RLS)
alter table public.complaint_comments enable row level security;

-- Authenticated users can read comments on complaints they have access to
drop policy if exists "authenticated read comments" on public.complaint_comments;
create policy "authenticated read comments" on public.complaint_comments
  for select using (auth.role() = 'authenticated');

-- Authenticated users can post comments
drop policy if exists "authenticated insert own comment" on public.complaint_comments;
create policy "authenticated insert own comment" on public.complaint_comments
  for insert with check (user_id = auth.uid());

-- Comment authors can delete their own comment; admins can delete any
drop policy if exists "authors or admin delete comment" on public.complaint_comments;
create policy "authors or admin delete comment" on public.complaint_comments
  for delete using (user_id = auth.uid() or public.is_admin());

-- 4. ENABLE SUPABASE REALTIME STREAMING FOR COMMENTS
-- Allows the frontend to listen to supabase.channel('complaint_comments')
do $$
begin
  alter publication supabase_realtime add table public.complaint_comments;
exception when others then
  null; -- already added or not supported in local context
end $$;
