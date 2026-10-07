# 🛠️ Campus Complaints — Backend Architecture

This directory contains the entire backend infrastructure for the **Campus Problem Reporting System**, built on **Supabase (PostgreSQL 15+)**.

---

## 📁 Directory Structure

```
backend/
├── schema.sql                 # Complete master SQL schema (v2.0)
├── migrations/                # Modular, step-by-step SQL migrations
│   ├── 01_initial_schema.sql  # Core tables, profiles, triggers, storage
│   ├── 02_upvotes_and_engagement.sql # "I Have This Problem Too" counter & toggle RPC
│   ├── 03_comments_communication.sql # Two-way comment thread & realtime
│   ├── 04_campus_locations.sql       # Standardized campus location hierarchy
│   └── 05_student_actions.sql        # Student withdrawal & self-resolve RPCs
├── seed.sql                   # Realistic demo data (complaints, upvotes, comments)
├── types/
│   └── database.types.ts      # Strongly typed TypeScript database interfaces
├── api-contract.md            # Integration guide & query snippets for frontend / Figma MCP
└── README.md                  # This file
```

---

## 🚀 How to Apply the Backend

### Option A: Apply Everything at Once (Recommended)
1. Open your Supabase Dashboard → **SQL Editor**.
2. Open [`schema.sql`](schema.sql), copy all contents, and click **Run**.
3. (Optional) Run [`seed.sql`](seed.sql) to populate realistic demo records with upvotes and comments.

### Option B: Apply Migrations Sequentially
Run the files in `migrations/` in numerical order:
1. `01_initial_schema.sql`
2. `02_upvotes_and_engagement.sql`
3. `03_comments_communication.sql`
4. `04_campus_locations.sql`
5. `05_student_actions.sql`

---

## 🔒 Security & Row Level Security (RLS)
* **Profiles:** Readable by authenticated users; users cannot modify their own role.
* **Complaints:** Visible to all authenticated users; only the author can submit; only admins can edit status (except student self-resolution).
* **Upvotes:** Enforces 1 upvote per user per complaint via unique constraint; only the upvoter can remove their upvote.
* **Comments:** Authenticated users can post; comments posted by administrators are automatically flagged with `is_official = true`.
* **Storage:** Authenticated users can upload to `complaint-images/`; only the uploader can overwrite images within their `user_id/` directory; public read is enabled.

---

## 🤝 Handoff to Frontend Collaborator (Figma MCP)
Share [`api-contract.md`](api-contract.md) with your frontend partner. It contains ready-to-copy code snippets for:
* Fetching complaints with upvote state
* Toggling upvotes
* Streaming realtime comment threads
* Populating cascaded building/floor/room dropdowns
* Student self-resolve and withdrawal actions
