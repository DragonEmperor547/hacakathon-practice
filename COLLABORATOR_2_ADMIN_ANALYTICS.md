# 🛡️ Collaborator 2: Admin Metrics Dashboard & Workload Overview

> **Assigned Feature:** Admin Analytics Metrics, Department Workload & CSV Report Export  
> **Target Persona:** Campus Administrator (`admin@example.com` / `Demo1234!`)  
> **Goal:** Practice branching, feature development with AI prompts, isolated testing, audit logging, and conflict-free Pull Requests.

---

## 🎯 1. Feature Mission & Overview

Campus administrators currently only have a raw list of complaints. In a hackathon demo or real-world campus management meeting, administrators need an **executive analytics summary**:
1. How many issues are currently active vs resolved?
2. How many are marked as **Urgent**?
3. Which campus department (`assigned_team`: Electrical, Plumbing, HVAC, Facilities, Janitorial) has the heaviest workload?
4. A 1-click **"Export to CSV"** button to download a spreadsheet report of all campus complaints.

### What You Will Build:
1. A new component `components/AdminMetricsCard.tsx` that computes and renders:
   - 4 Top-level KPI cards: **Total Reports**, **Active (Pending/In Progress)**, **Resolved (%)**, and **Urgent Priority**.
   - A Department Workload Breakdown widget showing the complaint distribution across maintenance teams.
   - A **"Download CSV Report"** button that generates and downloads a `.csv` file in the browser without any third-party dependencies.
2. Embed the analytics component at the top of the Admin dashboard (`frontend/src/app/(admin)/index.tsx`) with an expandable toggle ("📊 View Analytics Overview").

---

## 🛡️ 2. Strict Boundary Rules (Zero Merge Conflicts)

To ensure zero merge conflicts with Collaborator 1:

| Allowed Files | Forbidden Files (DO NOT TOUCH) |
|---|---|
| ✅ `frontend/components/AdminMetricsCard.tsx` (New) | ❌ Anything in `frontend/src/app/(student)/` |
| ✅ `frontend/src/app/(admin)/index.tsx` (Top section edit only) | ❌ Root `AUDIT_LOG.md` (use `audit_logs/` instead) |
| ✅ `audit_logs/AUDIT_LOG_<YOURNAME>_ANALYTICS.md` (New) | ❌ `backend/` or `supabase_schema.sql` |
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
git checkout -b feature/admin-analytics-yourname

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
* Log in with demo admin credentials:
  * **Email:** `admin@example.com`
  * **Password:** `Demo1234!`
* Confirm the Admin control panel loads properly. Keep this tab open while you work.

---

### Step 3: Implement with Your IDE Agent (Copy-Paste Prompt)

Copy the prompt below and paste it directly into your AI Assistant (Antigravity / Cursor / Claude Code):

````markdown
We need to implement an Admin Analytics Dashboard & Department Workload Card for the Admin Portal in our Expo React Native app.

### Architecture & Context:
- Project uses Expo Router with TypeScript.
- Frontend root is `frontend/`.
- Colors and theme tokens must be imported from `@/constants/theme` (`COLORS`).
- Admin screen is located at `frontend/src/app/(admin)/index.tsx`.
- The complaint objects in state have:
  - `status`: 'Pending' | 'In Progress' | 'Resolved' | 'Rejected' | 'Withdrawn'
  - `priority`: 'Low' | 'Medium' | 'High' | 'Urgent'
  - `assigned_team`: 'Facilities' | 'Electrical' | 'Plumbing' | 'HVAC / Cooling' | 'IT & Network' | 'Janitorial' | 'Carpentry' | 'General Maintenance' | null
  - `category`, `title`, `location`, `created_at`, `reference_code`

### Exact Tasks:
1. Create a new component `frontend/components/AdminMetricsCard.tsx`:
   - Props:
     ```typescript
     interface AdminMetricsCardProps {
       complaints: Complaint[];
     }
     ```
   - Calculate metrics:
     - `total`: complaints.length
     - `active`: count of status 'Pending' or 'In Progress'
     - `resolved`: count of status 'Resolved' (and resolution rate percentage `Math.round((resolved / total) * 100) || 0`)
     - `urgent`: count of priority 'Urgent'
   - Department Workload:
     - Count complaints per `assigned_team` (including 'Unassigned' for null values).
     - Display them in a clean horizontal or grid list of department pills showing team name and count badge.
   - CSV Export Functionality (Web compatible):
     - Add a button "📥 Export CSV Report".
     - Generates CSV string with headers: `Reference,Title,Category,Location,Priority,Status,Assigned Team,Created At`.
     - In Web environment, triggers download via `URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }))` and a temporary `<a download="campus_complaints_report.csv">` tag.
     - On mobile fallback, use simple console log or alert message.

2. Integrate into `frontend/src/app/(admin)/index.tsx`:
   - Import `AdminMetricsCard` into `AdminDashboardScreen`.
   - Place a collapsible accordion / card toggle above the search bar:
     - Toggle header: "📊 Analytics & Department Workload [Show / Hide]"
     - When expanded, renders `<AdminMetricsCard complaints={complaints} />`.
   - Default state can be collapsed or expanded based on screen width.

### Strict Technical Constraints:
- Use standard React Native `StyleSheet.create` and `COLORS` from `@/constants/theme`.
- Do NOT install chart libraries (like victory-native or react-native-chart-kit) that break Expo web. Use styled flexbox progress bars, count cards, and badge pills.
- Must run cleanly on Web (`npx expo start --web`).
- Do NOT modify any files inside `frontend/src/app/(student)/` or database schema files.
````

---

### Step 4: Verification & Testing Checklist

Before committing, test the following in your browser (`http://localhost:8081`):
- [ ] Log in as `admin@example.com` / `Demo1234!`.
- [ ] Analytics banner/card is visible above the complaint list.
- [ ] Total, Active, Resolved (%), and Urgent counts match the actual complaints displayed.
- [ ] Department workload correctly shows assigned team counts.
- [ ] Clicking "Export CSV Report" downloads a valid `.csv` file in your browser that opens cleanly in Excel or Notepad.
- [ ] Responsive check: Resizing browser window from desktop to mobile width does not break layout.
- [ ] Run TypeScript check in terminal:
  ```bash
  cd frontend
  npx tsc --noEmit
  ```
  *(Must exit with 0 errors).*

---

### Step 5: Create Your Personal Audit Log

To prevent Git merge conflicts on `AUDIT_LOG.md`, create your own audit file at:  
`audit_logs/AUDIT_LOG_<YOURNAME>_ANALYTICS.md`

Use this exact markdown format:
```markdown
# 📜 Audit Log — Admin Metrics & Workload Dashboard
* **Author:** [Your Full Name]
* **Branch:** feature/admin-analytics-[yourname]
* **Date:** 2026-10-07
* **Scope:** Frontend (Admin Portal)

## 🛠️ Changes Implemented
1. `frontend/components/AdminMetricsCard.tsx`:
   - Built 4-KPI metrics grid (Total, Active, Resolved %, Urgent).
   - Added Department Workload breakdown widget.
   - Built zero-dependency CSV report exporter using Web Blob API.
2. `frontend/src/app/(admin)/index.tsx`:
   - Embedded collapsible analytics overview above admin complaints list.

## 🧪 Verification & Testing
- Tested on Web (`npm run web`): All KPI counts calculate accurately.
- Verified CSV export: Successfully downloads `campus_complaints_report.csv` in Chrome.
- Verified TypeScript compilation: `npx tsc --noEmit` passed with 0 errors.
```

---

### Step 6: Commit, Push & Open Pull Request (PR)

Run these Git commands:
```bash
# 1. Check changed files (make sure only your files are listed)
git status

# 2. Stage your files
git add frontend/components/AdminMetricsCard.tsx
git add frontend/src/app/(admin)/index.tsx
git add audit_logs/AUDIT_LOG_<YOURNAME>_ANALYTICS.md

# 3. Commit to your branch
git commit -m "feat(admin): add metrics dashboard and department workload cards"

# 4. Push branch to GitHub
git push -u origin feature/admin-analytics-yourname
```

#### Opening the PR on GitHub:
1. Open the repository on GitHub.
2. Click the yellow banner: **"Compare & pull request"**.
3. **Base:** `main`  ←  **Compare:** `feature/admin-analytics-yourname`.
4. Title: `feat: Admin analytics & department workload dashboard`.
5. In description, mention: *"Audit log included in audit_logs/ directory. Ready for team lead conflict check."*
6. Click **Create pull request**. Do **NOT** merge it yourself!

---

## ⚠️ 4. Troubleshooting & Common Errors

### Error 1: "document is not defined / Blob download fails on native mobile"
* **Cause:** Web DOM APIs (`document.createElement`, `URL.createObjectURL`) do not exist in native iOS/Android environments.
* **Fix:** Guard your CSV download code with `Platform.OS === 'web'`:
  ```typescript
  import { Platform } from 'react-native';

  if (Platform.OS === 'web') {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'complaints_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    console.log('CSV download is supported on web.');
  }
  ```

### Error 2: "Metro bundler shows 404 or white blank screen on web"
* **Cause:** Metro cache is stale or node_modules path is out of sync.
* **Fix:**
  ```bash
  cd frontend
  npx expo start -c --web
  ```

### Error 3: "Division by zero in percentage calculation"
* **Cause:** When there are 0 complaints, `(resolved / total) * 100` returns `NaN`.
* **Fix:** Always provide a default fallback:
  ```typescript
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  ```

### Error 4: "I accidentally committed on `main` instead of my branch"
* **Fix:**
  ```bash
  # Create and switch to your feature branch with the changes
  git branch feature/admin-analytics-yourname
  git checkout feature/admin-analytics-yourname
  # Reset main back to origin
  git checkout main
  git reset --hard origin/main
  git checkout feature/admin-analytics-yourname
  ```

### Error 5: "GitHub says: Can't automatically merge / Merge conflict"
* **Cause:** `main` was updated with changes while you were working.
* **Fix:**
  ```bash
  git checkout feature/admin-analytics-yourname
  git fetch origin
  git merge origin/main
  ```
  Open VS Code, accept current/incoming changes in the diff editor, then:
  ```bash
  git commit -m "chore: merge main into feature branch"
  git push origin feature/admin-analytics-yourname
  ```
