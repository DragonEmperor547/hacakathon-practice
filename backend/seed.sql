-- ========================================================
-- backend/seed.sql
-- Realistic Demo Seed Data with Upvotes, Comments, Locations, and Statuses
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

-- 2. Clean previous sample complaints if re-seeding
-- (Assumes demo accounts student@example.com and admin@example.com exist in auth.users)
do $$
declare
  student_uid uuid;
  admin_uid uuid;
  loc_light uuid;
  loc_chair uuid;
  loc_leak uuid;
  loc_clean uuid;
  loc_wifi uuid;
  
  c1_id uuid;
  c2_id uuid;
  c3_id uuid;
  c4_id uuid;
  c5_id uuid;
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

  -- Insert Complaint 1: In Progress with upvotes and discussion
  insert into public.complaints (
    user_id, title, description, category, location, location_id, status, priority, admin_note
  ) values (
    student_uid,
    'Flickering tube light in 1st floor corridor',
    'The tube light outside Room 201 keeps flickering and goes off in the evening. It is pitch dark during late study hours.',
    'Lighting',
    'Block A (Engineering), 1st Floor, Corridor & Washrooms',
    loc_light,
    'In Progress',
    'Medium',
    'Electrician assigned. Replacement ballast ordered.'
  ) returning id into c1_id;

  -- Insert Complaint 2: Urgent Leakage with high upvotes
  insert into public.complaints (
    user_id, title, description, category, location, location_id, status, priority, admin_note
  ) values (
    student_uid,
    'Water leaking from AC ceiling onto books',
    'Heavy water dripping directly above Section D bookshelves in the reading hall. Books are getting damp.',
    'Water Leakage',
    'Central Library, 2nd Floor, Reading Hall & AC Wing',
    loc_leak,
    'Pending',
    'Urgent',
    null
  ) returning id into c2_id;

  -- Insert Complaint 3: Wi-Fi Disconnecting
  insert into public.complaints (
    user_id, title, description, category, location, location_id, status, priority, admin_note
  ) values (
    student_uid,
    'Hostel 3rd floor Wi-Fi keeps dropping every 2 mins',
    'Access point restarts continuously during peak study hours between 8 PM and 11 PM.',
    'Network',
    'Hostel Block 2 (Girls), 3rd Floor, Wi-Fi Hub & Study Room',
    loc_wifi,
    'Pending',
    'High',
    null
  ) returning id into c3_id;

  -- Insert Complaint 4: Resolved chair
  insert into public.complaints (
    user_id, title, description, category, location, location_id, status, priority, admin_note
  ) values (
    student_uid,
    'Broken desk chair in Room 204',
    'Backrest cracked in third row, seat 5.',
    'Furniture',
    'Block B (Management), 2nd Floor, Room 204',
    loc_chair,
    'Resolved',
    'Low',
    'Replaced chair with a new ergonomic unit from storage.'
  ) returning id into c4_id;

  -- Insert Upvotes (student upvoted their own / other issues)
  insert into public.complaint_upvotes (complaint_id, user_id) values
    (c1_id, student_uid),
    (c2_id, student_uid),
    (c3_id, student_uid)
  on conflict do nothing;

  if admin_uid is not null then
    insert into public.complaint_upvotes (complaint_id, user_id) values
      (c2_id, admin_uid)
    on conflict do nothing;
  end if;

  -- Insert Two-Way Comments Thread on Complaint 1
  insert into public.complaint_comments (complaint_id, user_id, message) values
    (student_uid, c1_id, 'Has anyone checked this today? It buzzed loudly during our evening lab.');

  if admin_uid is not null then
    insert into public.complaint_comments (complaint_id, user_id, message) values
      (c1_id, admin_uid, 'Electrician arrived at 10 AM. Parts arriving this afternoon.');
  end if;

  insert into public.complaint_comments (complaint_id, user_id, message) values
    (student_uid, c1_id, 'Thank you for the quick update!');

end $$;
