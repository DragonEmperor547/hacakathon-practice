# 📋 CampusCare — Backend Requirements & Feature Gaps (From Figma Design)

> **Document Purpose:**  
> This specification documents all features, data fields, and endpoints identified during the Figma design analysis of the **CampusCare** mobile application (`https://www.figma.com/design/XQw8JnfhmZd3EkOb35OD0z`) that are currently missing or require expansion in the Supabase backend.
>
> **Target Audience:** Backend Collaborator (`backend/schema.sql`, `backend/migrations/`)

---

## 🎯 Executive Summary of Gaps

While `annas-branch` added upvotes, comments, and standardized locations (`v2.0`), the Figma designs introduce several high-impact user flows that require backend schema and RPC updates:

1. **Short Human-Readable Reference Codes** (`#CC-1031`, `#CC-1048`) instead of raw UUIDs.
2. **Duplicate Detection & "Similar Issues Nearby" RPC** to suggest existing reports and encourage upvoting before filing duplicates.
3. **Multi-Image Attachments (Up to 4 Photos)** (`image_urls text[]` instead of single `image_url text`).
4. **"Assigned Team" / Department Field** in Admin management (`assigned_team text`).
5. **Unified Activity Stream** blending status change audit logs, official resolution notes, and two-way discussion messages into a cohesive timeline.
6. **Trending Feed Algorithm** to rank complaints by student engagement and upvotes.
7. **Notification System / Logs** for student status update notifications ("We'll notify you when it moves forward").

---

## 🔍 Detailed Feature Gap Analysis

### 1. Human-Readable Reference Numbers (`#CC-XXXX`)
* **Figma Screens:** 
  - `CampusCare — Complaint overview` (`#CC-1031`)
  - `CampusCare — Activity and comments supported` (`#CC-1031`)
  - `CampusCare — Report a problem mobile` (Modal: "Your report #CC-1048 is now Pending")
  - `CampusCare — Admin complaint detail mobile` (`COMPLAINT #CC-1048`)
* **Current State:** 
  - `complaints.id` is a `uuid` (`c36f02e...`). Showing UUIDs in user-facing UI looks unpolished and does not match the Figma design.
* **Backend Recommendation:**
  - Add a sequence and column:
  ```sql
  create sequence if not exists complaint_ref_seq start with 1001;
  alter table public.complaints 
    add column if not exists reference_code text unique 
    default ('CC-' || nextval('complaint_ref_seq')::text);
  ```

---

### 2. "Similar Issues Nearby" / Duplicate Prevention RPC
* **Figma Screen:** `CampusCare — Similar issues nearby` (Bottom sheet modal triggered when a student enters location/category):
  > *"Similar issues nearby: Is this the same problem? Add your support so the team knows who's affected. Broken AC - Hall A · 12 students affected · In Progress [Same problem - Upvote] [Different issue - Continue]"*
* **Current State:**
  - No matching or search RPC exists in `backend/schema.sql`.
* **Backend Recommendation:**
  - Create an RPC function:
  ```sql
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
    upvotes_count integer,
    created_at timestamptz
  )
  language sql stable as $$
    select id, reference_code, title, category, location, status, upvotes_count, created_at
    from public.complaints
    where status in ('Pending', 'In Progress')
      and (
        category = p_category 
        or location ilike '%' || p_location || '%'
        or p_location ilike '%' || location || '%'
      )
      and (p_exclude_id is null or id <> p_exclude_id)
    order by upvotes_count desc, created_at desc
    limit 5;
  $$;
  ```

---

### 3. Multiple Photo Uploads (Up to 4 Images)
* **Figma Screen:** `CampusCare — Report a problem mobile`:
  > *"Add photos: Up to 4 · JPG or PNG | Take photo | Gallery | (+2 more photos)"*
* **Current State:**
  - `complaints.image_url text` only stores 1 single URL.
* **Backend Recommendation:**
  - Option A: Change/expand `complaints.image_url` to `complaints.image_urls text[] default '{}'::text[]` (or keep `image_url` as primary thumbnail and add `image_urls text[]`).
  - Option B: Add a `complaint_photos` child table:
  ```sql
  create table if not exists public.complaint_photos (
    id uuid primary key default gen_random_uuid(),
    complaint_id uuid not null references public.complaints(id) on delete cascade,
    image_url text not null,
    created_at timestamptz not null default now()
  );
  ```

---

### 4. "Assigned Team" / Department Field in Admin Panel
* **Figma Screen:** `CampusCare — Admin complaint detail mobile`:
  > *"Update complaint: Status | Priority | Admin note | Assigned team: [Facilities / Electrical / Plumbing / IT]"*
* **Current State:**
  - `complaints` table only contains `status`, `priority`, and `admin_note`. There is no column for the responsible maintenance department/team.
* **Backend Recommendation:**
  ```sql
  alter table public.complaints 
    add column if not exists assigned_team text;
    -- e.g. 'Facilities', 'Plumbing', 'Electrical', 'HVAC / Cooling', 'IT & Network', 'Janitorial'
  ```

---

### 5. Unified Activity & Comments Stream
* **Figma Screen:** `CampusCare — Activity and comments supported`:
  - Shows an integrated timeline containing:
    1. **Status events**: "Submitted (Sep 28 · 9:14 AM)", "In Progress (Sep 28 · 2:40 PM - Facilities team assigned)"
    2. **Admin chat messages**: with official shield/badge and direct remarks
    3. **Student chat messages**: with "You" bubble and timestamp
    4. **Resolution note**: special highlighted banner ("Admin · Resolution note - The faulty fitting has been replaced and tested.")
* **Current State:**
  - Status events are in `status_history`.
  - Chat messages are in `complaint_comments`.
  - Frontend currently has to execute 2 distinct queries and manually merge and sort them.
* **Backend Recommendation:**
  - Provide a unified SQL view or RPC:
  ```sql
  create or replace function public.get_complaint_activity_stream(p_complaint_id uuid)
  returns json
  language sql stable as $$
    -- Unified query returning combined chronological feed
    ...
  $$;
  ```

---

### 6. "Trending" Sorting / Feed Filter
* **Figma Screens:** `CampusCare — Complaints default` and `CampusCare — Complaints support added`:
  - Filter Tabs: `All (3)`, `Open (2)`, `Trending`
  - Trending issues surface high-impact campus problems with the most student upvotes and recent activity.
* **Current State:**
  - Default query is simply `order by created_at desc`.
* **Backend Recommendation:**
  - Ensure index on `upvotes_count desc, created_at desc` is present.
  - Support client querying: `.order('upvotes_count', { ascending: false }).order('created_at', { ascending: false })`.

---

### 7. Notification Logs / Tracking
* **Figma Screen:** `CampusCare — Report a problem mobile`:
  > *"Your report #CC-1048 is now Pending. We’ll notify you when it moves forward."*
* **Current State:**
  - No `notifications` table exists to inform students when an admin changes their complaint status or leaves an admin note.
* **Backend Recommendation:**
  ```sql
  create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    complaint_id uuid not null references public.complaints(id) on delete cascade,
    title text not null,
    message text not null,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
  );
  ```

---

## 🛠️ Summary Checklist for Backend Collaborator

| Priority | Feature Requirement | Schema / RPC Change | Impact on Frontend |
|---|---|---|---|
| 🔴 High | Reference Code (`#CC-1031`) | Add sequence + `reference_code` column | Replaces raw UUIDs across cards and headers |
| 🔴 High | Multi-Photo Support (Up to 4) | Add `image_urls text[]` or `complaint_photos` | Enables full 4-photo picker and gallery in report form |
| 🟡 Medium | Duplicate Detection RPC | Add `find_similar_complaints(...)` | Enables "Similar issues nearby" bottom sheet modal |
| 🟡 Medium | Assigned Team | Add `assigned_team text` to `complaints` | Enables Admin team assignment dropdown |
| 🟢 Low | Notification Table | Add `notifications` table & trigger | Enables in-app notification center |

---
*Created for the CampusCare project pair programming workflow.*
