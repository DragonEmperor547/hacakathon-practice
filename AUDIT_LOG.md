# 📜 CampusCare — Project Audit Log & Change History

> **ATTENTION ALL COLLABORATORS & AI AGENTS:**  
> This file is the single source of truth for all historical, architectural, and database changes across the CampusCare project. Whenever you introduce new features, database schema modifications, or frontend redesigns, **you must append a new entry** to this log following the template at the bottom of this file.

---

## 📌 Quick Summary of Current State

* **Active Architecture:** Decoupled Root (`frontend/` for Expo app, `backend/` for Supabase migrations and schemas).
* **Current Backend Version:** `v2.1 (CampusCare Figma Parity)`
* **Database Platform:** Supabase (PostgreSQL 15+, Auth, Storage, Realtime)
* **Demo Accounts Available:**
  * **Student:** `student@example.com` / `Demo1234!`
  * **Admin:** `admin@example.com` / `Demo1234!`

---

## 🕒 Chronological Project Audit Log

### Entry 001 — Project Stabilization & Native Android Crash Fixes
* **Date:** 2026-10-06
* **Branch:** `main`
* **Changes Made:**
  1. **Package Dependency Alignment:** Updated `@react-native-async-storage/async-storage` to `2.2.0` and `expo-image-picker` to `~57.0.20` to meet Expo SDK 57 requirements.
  2. **Corrupted Node Tree Cleanup:** Removed orphan empty directory stubs in nested `node_modules` that were causing npm's Arborist tree resolver to throw `TypeError: Invalid Version:`. Regenerated a clean `package-lock.json`.
  3. **Resolved Android Red Screen Error 500:** 
     * **Root Cause:** Metro bundler failed on Android because `@expo-google-fonts/material-symbols@0.4.48` was missing the font binary `MaterialSymbols_400Regular.ttf` (it had published `.ttf.png` instead).
     * **Fix:** Upgraded `@expo-google-fonts/material-symbols` to `0.4.49`.
     * **Verification:** Successfully bundled all 1,499 Android modules with 0 errors.

---

### Entry 002 — Supabase Live Backend Setup & Auth Hardening
* **Date:** 2026-10-06
* **Branch:** `main`
* **Changes Made:**
  1. **Database Table Creation:** Executed initial schema on live Supabase project creating `profiles`, `complaints`, `status_history`, and the `complaint-images` storage bucket.
  2. **Auth Rate Limit Fix:** Identified and disabled `mailer_autoconfirm` ("Confirm email") in Supabase Auth settings to prevent `429 rate limit exceeded` and allow instant demo logins.
  3. **Security Vulnerability Closed:** Removed an unsafe RLS policy that previously allowed students to update their own profile role to `admin`.
  4. **Session Deadlock Fix:** In `AuthContext.tsx`, deferred profile fetching outside Supabase's `onAuthStateChange` listener to prevent authentication deadlocks.
  5. **Demo Seed Data:** Created initial test accounts (`student@example.com` and `admin@example.com`) and seeded 6 diverse complaints with status history.

---

### Entry 003 — Mobile Expo Go Connectivity Solutions
* **Date:** 2026-10-06
* **Branch:** `main`
* **Changes Made:**
  1. **Network Diagnostics:** Diagnosed why mobile Expo Go showed a blue screen timeout when scanning the QR code:
     * PC was on a Wi-Fi network (`397 Surveillance`) set to Windows `Public` profile.
     * Surveillance/guest routers enforce AP (Client) Isolation, preventing peer-to-peer phone-to-PC connections.
  2. **Tunnel & Workaround Setup:** Installed `@expo/ngrok` and documented the zero-friction phone Mobile Hotspot and `adb reverse tcp:8081 tcp:8081` USB solutions.
  3. **Fail-Proof Setup Documentation:** Created [`instruction.md`](instruction.md) enforcing a strict **"Happy Path First, Fixes Only on Error"** doctrine to prevent agents from running unnecessary installs.

---

### Entry 004 — Architectural Partitioning (`frontend/` & `backend/`)
* **Date:** 2026-10-07
* **Branch:** `annas-branch` → merged to `main`
* **Changes Made:**
  1. **Repository Split:** Moved the entire React Native / Expo application into a dedicated root folder `frontend/` so frontend contributors using Figma MCP can build without merge conflicts.
  2. **Backend Isolation:** Established `backend/` to host all database migrations, master schemas, TypeScript definitions, seed data, and integration contracts.
  3. **Clean Merge:** Fast-forward merged `annas-branch` into `main` with zero conflicts.

---

### Entry 005 — Backend v2.0: Community Engagement Features
* **Date:** 2026-10-07
* **Branch:** `annas-branch` → merged to `main`
* **Changes Made:**
  1. **"I Have This Problem Too" (Upvoting):**
     * Created `public.complaint_upvotes` table with a unique constraint `(complaint_id, user_id)`.
     * Added `complaints.upvotes_count` with an automatic database trigger (`trg_sync_complaint_upvotes`) that calculates counts atomically.
     * Added atomic RPC function `public.toggle_complaint_upvote(target_complaint_id)`.
  2. **Two-Way Comment Discussion Thread:**
     * Created `public.complaint_comments` table.
     * Added trigger `trg_tag_comment_role` that automatically flags official comments with `is_official = true` when posted by administrators.
     * Subscribed `complaint_comments` to Supabase Realtime.
  3. **Standardized Campus Locations:**
     * Created `public.campus_locations` with `building`, `floor`, and `room`.
     * Seeded standard campus infrastructure (Block A, Block B, Block C, Central Library, Hostels, Sports Complex).
     * Linked `complaints.location_id` to `campus_locations.id`.
  4. **Student Self-Resolution & Withdrawal:**
     * Added safe RLS policies and RPC functions `withdraw_my_complaint(id, reason)` and `self_resolve_my_complaint(id, remark)`.

---

### Entry 006 — Backend v2.1: CampusCare Figma Design Parity
* **Date:** 2026-10-07
* **Branch:** `frontend-figma-redesign`
* **Reference Spec:** [`FIGMA_BACKEND_REQUIREMENTS.md`](FIGMA_BACKEND_REQUIREMENTS.md)
* **Changes Made:**
  1. **Human-Readable Reference Codes (`#CC-1031`, `#CC-1048`):**
     * Created sequence `complaint_ref_seq START WITH 1001`.
     * Added `reference_code text UNIQUE DEFAULT ('CC-' || nextval('complaint_ref_seq')::text)` to `public.complaints`.
  2. **Multi-Photo Attachments (Up to 4 Photos):**
     * Added `image_urls text[] DEFAULT '{}'::text[]` to `public.complaints`.
     * Added trigger `trg_sync_complaint_image_urls` to automatically keep `image_url` (cover thumbnail) and `image_urls` in sync.
  3. **Assigned Team / Department Field:**
     * Added `assigned_team text` with check constraint (`'Facilities'`, `'Electrical'`, `'Plumbing'`, `'HVAC / Cooling'`, `'IT & Network'`, `'Janitorial'`, `'Carpentry'`, `'General Maintenance'`).
  4. **"Similar Issues Nearby" Duplicate Prevention RPC:**
     * Created `public.find_similar_complaints(p_category, p_location, p_exclude_id)`.
     * Performs fuzzy location matching and category matching across active issues (`Pending`, `In Progress`) to display existing issues in the bottom-sheet modal.
  5. **Unified Activity Stream RPC:**
     * Created `public.get_complaint_activity_stream(p_complaint_id)`.
     * Unifies `status_history` audit events and `complaint_comments` chat bubbles into a single chronological feed with `entry_type: 'status_change' | 'comment'`.
  6. **In-App Notifications System:**
     * Created `public.notifications` table with private RLS policies.
     * Created trigger `trg_notify_student` that automatically sends notifications to students when complaint status or assigned department updates.
     * Enabled Supabase Realtime publication on `notifications`.
  7. **Trending Feed Performance Index:**
     * Added composite index `(status, upvotes_count DESC, created_at DESC)` on `public.complaints`.
  8. **Documentation & Handoff:**
     * Updated [`backend/api-contract.md`](backend/api-contract.md) with copy-paste code snippets for the Figma MCP frontend implementation.
     * Updated [`backend/types/database.types.ts`](backend/types/database.types.ts) with full TypeScript definitions.
     * Updated [`backend/seed.sql`](backend/seed.sql) with sample `#CC-1031` and `#CC-1048` records.

---

### Entry 007 — Idempotent Schema & Frontend Run Fixes
* **Date:** 2026-10-07
* **Branch:** `frontend-figma-redesign` → merged to `main`
* **Scope:** Backend | Infrastructure
* **Changes Made:**
  1. **Idempotent Master Schema:** Running `backend/schema.sql` on a DB that already had v1 tables failed with `column "reference_code" does not exist`, because `CREATE TABLE IF NOT EXISTS` skips existing tables. Added `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for all v2.x columns, a `reference_code` backfill, and re-created the `status` / `assigned_team` check constraints. The script is now safe to re-run on empty or existing databases.
  2. **`supabase_schema.sql` Synced:** The root `supabase_schema.sql` was still the old v1 schema; it is now identical to `backend/schema.sql`.
  3. **Blank Web Screen / Red Expo Go Screen:** `frontend/node_modules` did not exist (packages were only in a stale root `node_modules`), so Metro returned 404 for the JS bundle. Fixed by running `npm install` inside `frontend/`.
  4. **Root `package.json`:** Forwards `npm start` / `web` / `android` / `ios` to `frontend/`.
* **⚠️ Action for collaborators:** After pulling, run `npm install` inside `frontend/`. Run the app with `cd frontend; npx expo start -c` (or `npm start` from root). Do **not** run `npx expo start` from the repo root.
* **Verification:** `npx tsc --noEmit` passes; Metro bundled web (962 modules) and Android (1500 modules) successfully.

---

## 📝 Template for Future Audit Entries

When adding new changes to this project, copy this template and append it to the list above:

```markdown
### Entry [XXX] — [Short Title of Work Done]
* **Date:** YYYY-MM-DD
* **Branch:** [branch-name]
* **Author / Agent:** [Your Name / Agent Identifier]
* **Scope:** [Frontend | Backend | Infrastructure | Documentation]
* **Changes Made:**
  1. **[Component/Table Name]:** [Description of what was modified, added, or deleted]
  2. **[Breaking Changes / Migrations]:** [List any database migrations needed or breaking props]
  3. **[Testing & Verification]:** [Commands run to verify correctness, e.g. tsc, expo-doctor, test scripts]
```
