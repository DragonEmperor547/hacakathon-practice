-- ========================================================
-- 05_student_actions.sql
-- Student Self-Resolution & Complaint Withdrawal
-- Allows students to withdraw accidental submissions or mark issues as self-resolved
-- ========================================================

-- 1. EXTEND STATUS CONSTRAINT IF NEEDED
-- Allows status to include 'Withdrawn'
alter table public.complaints 
  drop constraint if exists complaints_status_check;

alter table public.complaints 
  add constraint complaints_status_check 
  check (status in ('Pending', 'In Progress', 'Resolved', 'Rejected', 'Withdrawn'));

-- 2. RLS UPDATE POLICY FOR STUDENTS (Controlled self-resolution)
-- Students can ONLY update their own complaints, and ONLY to 'Withdrawn' or 'Resolved'
drop policy if exists "students update own status" on public.complaints;
create policy "students update own status" on public.complaints
  for update using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid() 
    and status in ('Resolved', 'Withdrawn')
  );

-- 3. CONVENIENCE RPC: WITHDRAW MY COMPLAINT
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

-- 4. CONVENIENCE RPC: SELF-RESOLVE MY COMPLAINT
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
