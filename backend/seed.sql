-- ========================================================
-- backend/seed.sql
-- Realistic Demo Seed Data with Reference Codes, Assigned Teams,
-- Multiple Photos, Upvotes, Comments, and Notifications
-- ========================================================

-- 1. Ensure campus locations exist
insert into public.campus_locations (building, floor, room) values
  ('Block A (Engineering)', 'Ground Floor', 'Physics Lab'),
  ('Block A (Engineering)', '1st Floor', 'Corridor & Washrooms'),
  ('Block B (Management)', '2nd Floor', 'Room 204'),
  ('Central Library', '2nd Floor', 'Reading Hall & AC Wing'),
  ('Hostel Block 2 (Girls)', '3rd Floor', 'Wi-Fi Hub & Study Room'),
  ('Sports Complex & Gym', 'Ground Floor', 'Gymnasium')
on conflict (building, floor, room) do nothing;

do $$
declare
  student_uid uuid;
  admin_uid uuid;
  loc_light uuid;
  loc_chair uuid;
  loc_leak uuid;
  loc_wifi uuid;
  
  c1_id uuid;
  c2_id uuid;
  c3_id uuid;
  c4_id uuid;
begin
  select id into student_uid from auth.users where email = 'student@example.com' limit 1;
  select id into admin_uid from auth.users where email = 'admin@example.com' limit 1;

  if student_uid is null then
    return;
  end if;

  select id into loc_light from public.campus_locations where room = 'Corridor & Washrooms' limit 1;
  select id into loc_chair from public.campus_locations where room = 'Room 204' limit 1;
  select id into loc_leak from public.campus_locations where room = 'Reading Hall & AC Wing' limit 1;
  select id into loc_wifi from public.campus_locations where room = 'Wi-Fi Hub & Study Room' limit 1;

  -- Complaint 1: #CC-1031 (Figma reference issue) with Assigned Team 'Electrical'
  insert into public.complaints (
    reference_code, user_id, title, description, category, location, location_id,
    status, priority, assigned_team, admin_note
  ) values (
    'CC-1031',
    student_uid,
    'Flickering tube light in 1st floor corridor',
    'The tube light outside Room 201 keeps flickering and goes off in the evening. It is pitch dark during late study hours.',
    'Lighting',
    'Block A (Engineering), 1st Floor, Corridor & Washrooms',
    loc_light,
    'In Progress',
    'Medium',
    'Electrical',
    'Electrician assigned. Replacement ballast ordered.'
  )
  on conflict (reference_code) do update
  set assigned_team = 'Electrical', status = 'In Progress'
  returning id into c1_id;

  -- Complaint 2: #CC-1048 (Figma reference issue) with Assigned Team 'Facilities' & Multiple Photos
  insert into public.complaints (
    reference_code, user_id, title, description, category, location, location_id,
    status, priority, assigned_team, admin_note
  ) values (
    'CC-1048',
    student_uid,
    'Water leaking from AC ceiling onto books',
    'Heavy water dripping directly above Section D bookshelves in the reading hall. Books are getting damp.',
    'Water Leakage',
    'Central Library, 2nd Floor, Reading Hall & AC Wing',
    loc_leak,
    'Pending',
    'Urgent',
    'Facilities',
    'Facilities team dispatched for inspection.'
  )
  on conflict (reference_code) do update
  set assigned_team = 'Facilities', priority = 'Urgent'
  returning id into c2_id;

  -- Complaint 3: Wi-Fi Disconnecting (Assigned Team 'IT & Network')
  insert into public.complaints (
    user_id, title, description, category, location, location_id,
    status, priority, assigned_team, admin_note
  ) values (
    student_uid,
    'Hostel 3rd floor Wi-Fi keeps dropping every 2 mins',
    'Access point restarts continuously during peak study hours between 8 PM and 11 PM.',
    'Network',
    'Hostel Block 2 (Girls), 3rd Floor, Wi-Fi Hub & Study Room',
    loc_wifi,
    'Pending',
    'High',
    'IT & Network',
    null
  ) returning id into c3_id;

  -- Upvotes
  if c1_id is not null then
    insert into public.complaint_upvotes (complaint_id, user_id) values (c1_id, student_uid) on conflict do nothing;
  end if;

  if c2_id is not null then
    insert into public.complaint_upvotes (complaint_id, user_id) values (c2_id, student_uid) on conflict do nothing;
    if admin_uid is not null then
      insert into public.complaint_upvotes (complaint_id, user_id) values (c2_id, admin_uid) on conflict do nothing;
    end if;
  end if;

  -- Two-Way Comments Thread on CC-1031
  if c1_id is not null then
    insert into public.complaint_comments (complaint_id, user_id, message) values
      (c1_id, student_uid, 'Has anyone checked this today? It buzzed loudly during our evening lab.');

    if admin_uid is not null then
      insert into public.complaint_comments (complaint_id, user_id, message, is_official) values
        (c1_id, admin_uid, 'Electrician arrived at 10 AM. Replacement ballast arriving this afternoon.', true);
    end if;
  end if;

  -- Seed Notification for Student
  if c2_id is not null then
    insert into public.notifications (user_id, complaint_id, title, message) values
      (student_uid, c2_id, 'Team Assigned: CC-1048', 'The Facilities department has been assigned to inspect the leak.');
  end if;

end $$;
