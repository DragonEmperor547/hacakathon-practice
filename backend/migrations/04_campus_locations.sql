-- ========================================================
-- 04_campus_locations.sql
-- Standardized Campus Location Hierarchy
-- Eliminates freeform typos and standardizes facility routing
-- ========================================================

-- 1. CAMPUS LOCATIONS TABLE
create table if not exists public.campus_locations (
  id uuid primary key default gen_random_uuid(),
  building text not null,
  floor text not null,
  room text not null,
  created_at timestamptz not null default now(),
  constraint unique_building_floor_room unique (building, floor, room)
);

create index if not exists idx_campus_locations_building on public.campus_locations(building);

-- Add optional foreign key to complaints table
alter table public.complaints 
  add column if not exists location_id uuid references public.campus_locations(id) on delete set null;

-- 2. ROW LEVEL SECURITY
alter table public.campus_locations enable row level security;

-- All authenticated users can read locations to populate dropdowns
drop policy if exists "authenticated read locations" on public.campus_locations;
create policy "authenticated read locations" on public.campus_locations
  for select using (auth.role() = 'authenticated');

-- Only admins can add or modify official campus locations
drop policy if exists "admins manage locations" on public.campus_locations;
create policy "admins manage locations" on public.campus_locations
  for all using (public.is_admin());

-- 3. SEED STANDARD CAMPUS LOCATIONS
insert into public.campus_locations (building, floor, room) values
  ('Block A (Engineering)', 'Ground Floor', 'Room 101'),
  ('Block A (Engineering)', 'Ground Floor', 'Room 102'),
  ('Block A (Engineering)', 'Ground Floor', 'Physics Lab'),
  ('Block A (Engineering)', '1st Floor', 'Room 201'),
  ('Block A (Engineering)', '1st Floor', 'Room 202'),
  ('Block A (Engineering)', '1st Floor', 'Corridor & Washrooms'),
  ('Block A (Engineering)', '2nd Floor', 'Computer Lab 1'),
  ('Block A (Engineering)', '2nd Floor', 'Computer Lab 2'),
  ('Block B (Management)', 'Ground Floor', 'Auditorium'),
  ('Block B (Management)', 'Ground Floor', 'Faculty Offices'),
  ('Block B (Management)', '1st Floor', 'Lecture Hall 1'),
  ('Block B (Management)', '1st Floor', 'Lecture Hall 2'),
  ('Block B (Management)', '2nd Floor', 'Room 204'),
  ('Block B (Management)', '2nd Floor', 'Seminar Room'),
  ('Block C (Sciences)', 'Ground Floor', 'Chemistry Lab'),
  ('Block C (Sciences)', 'Ground Floor', 'Biology Lab'),
  ('Block C (Sciences)', '1st Floor', 'Room 301'),
  ('Central Library', 'Ground Floor', 'Circulation Desk'),
  ('Central Library', '1st Floor', 'Silent Study Area'),
  ('Central Library', '2nd Floor', 'Reading Hall & AC Wing'),
  ('Hostel Block 1 (Boys)', 'Ground Floor', 'Dining Hall & Common Room'),
  ('Hostel Block 1 (Boys)', '1st Floor', 'Rooms 101-120'),
  ('Hostel Block 1 (Boys)', '2nd Floor', 'Rooms 201-220'),
  ('Hostel Block 2 (Girls)', 'Ground Floor', 'Dining Hall & Common Room'),
  ('Hostel Block 2 (Girls)', '1st Floor', 'Rooms 101-120'),
  ('Hostel Block 2 (Girls)', '2nd Floor', 'Rooms 201-220'),
  ('Hostel Block 2 (Girls)', '3rd Floor', 'Wi-Fi Hub & Study Room'),
  ('Sports Complex & Gym', 'Ground Floor', 'Badminton Court'),
  ('Sports Complex & Gym', 'Ground Floor', 'Gymnasium'),
  ('Student Center & Cafeteria', 'Ground Floor', 'Main Dining Area')
on conflict (building, floor, room) do nothing;
