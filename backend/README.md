# 🛠️ CampusCare — Backend Architecture (v2.1)

This directory contains the entire backend infrastructure for the **CampusCare** mobile application, built on **Supabase (PostgreSQL 15+)**.

---

## 📁 Directory Structure

```
backend/
├── schema.sql                 # Master consolidated schema (v2.1 with all Figma features)
├── migrations/                # Modular, step-by-step SQL migrations
│   ├── 01_initial_schema.sql  # Core tables, profiles, triggers, storage
│   ├── 02_upvotes_and_engagement.sql # "I Have This Problem Too" counter & toggle RPC
│   ├── 03_comments_communication.sql # Two-way comment thread & realtime
│   ├── 04_campus_locations.sql       # Standardized campus location hierarchy
│   ├── 05_student_actions.sql        # Student withdrawal & self-resolve RPCs
│   └── 06_figma_campuscare_features.sql # Reference codes (#CC-1031), multi-images,
│                                        # duplicate search RPC, assigned team,
│                                        # activity stream, and notifications
├── seed.sql                   # Realistic demo data (CC-1031, CC-1048, upvotes, chat, alerts)
├── types/
│   └── database.types.ts      # Strongly typed TypeScript database interfaces
├── api-contract.md            # Integration guide & query snippets for Figma MCP
└── README.md                  # This file
```

---

## 🚀 How to Apply the Backend to Supabase

### Option A: Apply Master Schema (Recommended for Fresh Setup)
1. Open your Supabase Dashboard → **SQL Editor**.
2. Open [`schema.sql`](schema.sql), copy all contents, and click **Run**.
3. (Optional) Run [`seed.sql`](seed.sql) to populate realistic demo records with `#CC-1031`, `#CC-1048`, and active discussions.

### Option B: Incremental Migrations (If You Already Have v2.0 Applied)
If your database already has migrations 01 through 05, you only need to run:
* [`migrations/06_figma_campuscare_features.sql`](migrations/06_figma_campuscare_features.sql)
It adds:
  * Sequence and column `reference_code` (`#CC-1001`, `#CC-1002`...)
  * `image_urls text[]` for up to 4 photos
  * `assigned_team text` with department constraint
  * `find_similar_complaints(...)` duplicate search RPC
  * `get_complaint_activity_stream(...)` unified timeline RPC
  * `notifications` table and automated trigger on status update
  * Realtime publication on `notifications`

---

## 🔒 Security & Row Level Security (RLS)
* **Profiles:** Readable by authenticated users; users cannot modify their own role.
* **Complaints:** Visible to all authenticated users; only the author can submit; only admins can edit status (except student self-resolution/withdrawal).
* **Upvotes:** Enforces 1 upvote per user per complaint; users toggle their own upvotes via atomic RPC.
* **Comments:** Authenticated users can post; comments posted by administrators are automatically tagged with `is_official = true`.
* **Notifications:** Enforces private access (`user_id = auth.uid()`).
* **Storage:** Authenticated users can upload to `complaint-images/`; only the uploader can overwrite images within their `user_id/` directory; public read is enabled.

---

## 🤝 Handoff to Frontend Collaborator (Figma MCP)
Share [`api-contract.md`](api-contract.md) with your frontend partner. It contains copy-paste Supabase JS code snippets for every Figma screen:
* "Similar issues nearby" bottom sheet search
* Multi-photo upload and submission
* Unified activity stream query
* Trending feed ranking
* Real-time notifications listener
* Upvoting and comment posting
