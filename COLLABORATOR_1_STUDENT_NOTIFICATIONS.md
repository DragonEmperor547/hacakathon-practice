# 🚀 Collaborator 1: Student Notification Center & Alerts

> **Assigned Feature:** Student In-App Notifications & Real-Time Alerts Drawer  
> **Target Persona:** Student User (`student@example.com` / `Demo1234!`)  
> **Goal:** Practice branching, feature development with AI prompts, isolated testing, audit logging, and conflict-free Pull Requests.

---

## 🎯 1. Feature Mission & Overview

Our backend already automatically creates notification records whenever an administrator updates a complaint's status or assigns a maintenance department (via the `public.notifications` table). 

However, **students currently have no visual alert in the app** to know their issue was updated. 

### What You Will Build:
1. A **Notification Bell Icon** in the top header of the Student Portal (`(student)/_layout.tsx`) showing an unread counter badge (e.g. `🔴 2`).
2. A sleek **Notification Drawer / Modal** (`components/NotificationModal.tsx`) that opens when the bell is clicked.
3. Features inside the modal:
   - Chronological list of notifications for the logged-in student.
   - Shows notification title (e.g., *Status Updated: #CC-1031*), message (*Your report has moved to In Progress*), and timestamp.
   - Distinct unread vs read visual styling.
   - **"Mark All as Read"** button that updates `is_read = true` in Supabase.
   - Tapping a notification navigates the student directly to `/complaint/[id]`.

---

## 🛡️ 2. Strict Boundary Rules (Zero Merge Conflicts)

To make sure your branch merges cleanly without touching your teammate's code:

| Allowed Files | Forbidden Files (DO NOT TOUCH) |
|---|---|
| ✅ `frontend/components/NotificationModal.tsx` (New) | ❌ Anything in `frontend/src/app/(admin)/` |
| ✅ `frontend/src/app/(student)/_layout.tsx` (Header edit only) | ❌ Root `AUDIT_LOG.md` (use `audit_logs/` instead) |
| ✅ `audit_logs/AUDIT_LOG_<YOURNAME>_NOTIFICATIONS.md` (New) | ❌ `backend/` or `supabase_schema.sql` |
| | ❌ Root `package.json` or `.env` |

---

## 📋 3. Step-by-Step Execution Plan

### Step 1: Branch Off from `main`
Open your terminal (PowerShell or Bash) in the repository root and run:
```bash
# 1. Fetch latest changes from remote
git checkout main
git pull origin main

# 2. Create your isolated feature branch (replace 'yourname' with your actual name)
git checkout -b feature/student-notifications-yourname

# 3. Verify you are on your new branch
git status
```

---

### Step 2: Start & Test the Baseline App
```bash
# Navigate to frontend and start web server
cd frontend
npm run web
```
* Open `http://localhost:8081` in your browser.
* Log in with demo student credentials:
  * **Email:** `student@example.com`
  * **Password:** `Demo1234!`
* Confirm the student dashboard loads properly. Keep this tab open while you work.

---

### Step 3: Implement with Your IDE Agent (Copy-Paste Prompt)

Copy the prompt below and paste it directly into your AI Assistant (Antigravity / Cursor / Claude Code):

````markdown
We need to implement an In-App Notification Center for the Student Portal in our Expo React Native app.

### Architecture & Context:
- Project uses Expo Router with TypeScript.
- Frontend root is `frontend/`.
- Colors and theme tokens must be imported from `@/constants/theme` (`COLORS`).
- Supabase client is imported from `@/lib/supabase` (or use `@/lib/api`).
- Current authenticated user is obtained via `useAuth()` from `@/context/AuthContext`.
- Database Table: `public.notifications`
  - Columns:
    - `id` (uuid)
    - `user_id` (uuid)
    - `complaint_id` (uuid)
    - `title` (text)
    - `message` (text)
    - `is_read` (boolean, default false)
    - `created_at` (timestamptz)

### Exact Tasks:
1. Create a new component `frontend/components/NotificationModal.tsx`:
   - Define a local interface:
     ```typescript
     export interface StudentNotification {
       id: string;
       user_id: string;
       complaint_id: string | null;
       title: string;
       message: string;
       is_read: boolean;
       created_at: string;
     }
     ```
   - Fetches notifications where `user_id = user.id`, ordered by `created_at desc` (limit 20).
   - Renders a clean Modal / Slide-over with:
     - Header: "Notifications" with unread count pill and a close button (✕).
     - "Mark all as read" button: runs an update query `update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)`.
     - Empty state: "No notifications yet. You will be alerted when admins update your reports."
     - Notification items:
       - Displays unread badge (accent dot).
       - Shows title, message body, and formatted relative time (e.g., "Just now", "2h ago", "Oct 7").
       - When pressed, marks that item as read and (if `complaint_id` exists) closes the modal and navigates via `router.push('/(student)/complaint/' + item.complaint_id)`.
   - Exports both the Modal component AND a `NotificationBellButton` component that displays the bell icon and badge counter (`unreadCount > 0 ? <Badge /> : null`).

2. Wire the Bell into `frontend/src/app/(student)/_layout.tsx`:
   - Import `NotificationBellButton` and `NotificationModal` into `StudentLayout`.
   - Place the bell button in the `headerBar` next to `userName` and before `Sign Out`.
   - Maintain clean layout with `flexDirection: 'row'`, `alignItems: 'center'`.

### Strict Technical Constraints:
- Use standard React Native `StyleSheet.create`.
- Do NOT install any native-only libraries. Use existing icons from `frontend/components/Icons.tsx` or clean Unicode/SVG.
- Must run cleanly on Web (`npx expo start --web`).
- Do NOT modify any files inside `frontend/src/app/(admin)/` or database schema files.
````

---

### Step 4: Verification & Testing Checklist

Before committing, test the following in your browser (`http://localhost:8081`):
- [ ] Log in as `student@example.com` / `Demo1234!`.
- [ ] Bell icon is visible in the top header.
- [ ] Clicking the bell opens the modal smoothly.
- [ ] Unread counter badge is visible if there are unread notifications.
- [ ] Clicking "Mark all as read" updates the UI and sets the badge count to 0.
- [ ] Clicking a notification with a valid complaint ID routes to the complaint details.
- [ ] Test closing the modal with the close button or background overlay.
- [ ] Run TypeScript check in terminal:
  ```bash
  cd frontend
  npx tsc --noEmit
  ```
  *(Must exit with 0 errors).*

---

### Step 5: Create Your Personal Audit Log

To prevent Git merge conflicts on `AUDIT_LOG.md`, create your own audit file at:  
`audit_logs/AUDIT_LOG_<YOURNAME>_NOTIFICATIONS.md`

Use this exact markdown format:
```markdown
# 📜 Audit Log — Student Notification Center
* **Author:** [Your Full Name]
* **Branch:** feature/student-notifications-[yourname]
* **Date:** 2026-10-07
* **Scope:** Frontend (Student Portal)

## 🛠️ Changes Implemented
1. `frontend/components/NotificationModal.tsx`:
   - Created bell icon with dynamic unread badge count.
   - Built student notifications list modal with real-time Supabase query.
   - Added "Mark All Read" action and navigation to complaint detail.
2. `frontend/src/app/(student)/_layout.tsx`:
   - Integrated notification bell into header navigation bar.

## 🧪 Verification & Testing
- Tested on Web (`npm run web`): Bell renders in header, unread items render with active badges.
- Verified TypeScript compilation: `npx tsc --noEmit` passed with 0 errors.
```

---

### Step 6: Commit, Push & Open Pull Request (PR)

Run these Git commands:
```bash
# 1. Check changed files (make sure only your files are listed)
git status

# 2. Stage your files
git add frontend/components/NotificationModal.tsx
git add frontend/src/app/(student)/_layout.tsx
git add audit_logs/AUDIT_LOG_<YOURNAME>_NOTIFICATIONS.md

# 3. Commit to your branch
git commit -m "feat(student): add in-app notification center and header bell"

# 4. Push branch to GitHub
git push -u origin feature/student-notifications-yourname
```

#### Opening the PR on GitHub:
1. Open the repository on GitHub.
2. Click the yellow banner: **"Compare & pull request"**.
3. **Base:** `main`  ←  **Compare:** `feature/student-notifications-yourname`.
4. Title: `feat: Student in-app notification center`.
5. In description, mention: *"Audit log included in audit_logs/ directory. Ready for team lead conflict check."*
6. Click **Create pull request**. Do **NOT** merge it yourself!

---

## ⚠️ 4. Troubleshooting & Common Errors

### Error 1: "Metro bundler shows 404 or white blank screen on web"
* **Cause:** Metro cache is stale or dependencies were run from wrong directory.
* **Fix:**
  ```bash
  cd frontend
  npx expo start -c --web
  ```

### Error 2: "Supabase returns 401 Unauthorized or empty array `[]`"
* **Cause:** User session is not active or user ID is not passed to the query.
* **Fix:** In your component, ensure you check `user?.id` before querying:
  ```typescript
  if (!user?.id) return;
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  ```

### Error 3: "Alert.alert() does nothing on web"
* **Cause:** React Native's `Alert.alert` is mobile-only and has no web implementation.
* **Fix:** Use an inline error/success text message in the modal or use a standard React state toggle for toast feedback.

### Error 4: "I accidentally committed on `main` instead of my branch"
* **Fix:**
  ```bash
  # Create and switch to your feature branch with the changes
  git branch feature/student-notifications-yourname
  git checkout feature/student-notifications-yourname
  # Reset main back to origin
  git checkout main
  git reset --hard origin/main
  git checkout feature/student-notifications-yourname
  ```

### Error 5: "GitHub says: Can't automatically merge / Merge conflict"
* **Cause:** `main` was updated with changes while you were working.
* **Fix:**
  ```bash
  git checkout feature/student-notifications-yourname
  git fetch origin
  git merge origin/main
  ```
  Open VS Code, accept current/incoming changes in the diff editor, then:
  ```bash
  git commit -m "chore: merge main into feature branch"
  git push origin feature/student-notifications-yourname
  ```
