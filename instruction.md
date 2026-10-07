# 🚀 Campus Complaints — Run & Setup Guide

> **FOR DEVELOPERS & AI AGENTS:**
> **Follow Section 1 (The Happy Path) first.** Do NOT install any extra packages, modify config files, or run database scripts unless a specific error from Section 3 occurs. The dependencies and code are already configured and tested.

---

## 1. 🟢 The Happy Path (Do This First)

Run these simple steps to start the application:

### Step 1: Navigate to Frontend & Install Dependencies
```bash
cd frontend
npm install
```
*(Installs the exact compatible versions from `frontend/package.json` — do not run `npm update` or install other packages).*

### Step 2: Environment Configuration
Make sure `.env` exists inside `frontend/` (or project root):
* If `.env` is missing, copy it from `.env.example`:
  ```bash
  # Windows PowerShell
  Copy-Item frontend/.env.example frontend/.env

  # macOS / Linux
  cp frontend/.env.example frontend/.env
  ```
* Verify it contains:
  ```env
  EXPO_PUBLIC_SUPABASE_URL=https://qnfhgpzqahvakmnbntwn.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_bAvFQKjnr8QAjXeTbqWPOQ_FnzzvKsU
  ```

### Step 3: Run the Application

#### To Run in Web Browser (Fastest for testing):
```bash
cd frontend
npx expo start --web
```
or
```bash
npm run web
```
The application will open in your browser at `http://localhost:8081`.

#### To Run on Your Mobile Phone (Expo Go):
```bash
npx expo start -c
```
* Open **Expo Go** on Android (or Camera app on iPhone).
* Scan the displayed QR code.

> **🎉 If the app loads and displays the login screen, STOP HERE! Everything is working.**

---

## 2. 🔑 Pre-Configured Demo Accounts

Use these accounts to test the app without signing up:

| Role | Email | Password | What to Test |
|---|---|---|---|
| **Student** | `student@example.com` | `Demo1234!` | View my complaints, report a new complaint, view detail & status timeline |
| **Admin** | `admin@example.com` | `Demo1234!` | Review all complaints, filter/search, update status, change priority, add admin note |

---

## 3. ⚠️ Troubleshooting (Read ONLY If a Specific Error Occurs)

> **IMPORTANT:** Only read and execute the fix that matches your exact error. Do not run these preventatively.

### Case A: Phone in Expo Go shows "Could not connect to server" / Blue screen timeout
* **Cause**: Your PC and phone are on a Wi-Fi network with **AP/Client Isolation** enabled (common on public, university, or surveillance Wi-Fi), or your PC Wi-Fi profile is set to **Public**.
* **Fix (Easiest)**:
  1. Turn on **Mobile Hotspot** on your phone.
  2. Connect your laptop/PC to your phone's hotspot.
  3. Run `npx expo start -c` and scan the QR code.
* **Alternative (USB Cable)**:
  1. Plug phone via USB with USB debugging enabled.
  2. Run `adb reverse tcp:8081 tcp:8081`.
  3. In Expo Go, tap **"Enter URL manually"** and enter `exp://localhost:8081`.

---

### Case B: Supabase returns "Table 'public.profiles' / 'complaints' not found" (404)
* **When this happens**: Only if you connected a brand new, empty Supabase project in `.env`.
* **Fix**:
  1. Open your Supabase project dashboard → **SQL Editor**.
  2. Copy the entire contents of [`supabase_schema.sql`](supabase_schema.sql) and click **Run**.
  3. In Supabase Dashboard → **Authentication** → **Providers** → **Email**, turn **"Confirm email"** to **OFF** (so demo accounts can sign in immediately without email rate limit errors).

---

### Case C: You created a new user and want to make them an Admin
* **Fix**:
  In your Supabase SQL Editor, run:
  ```sql
  UPDATE public.profiles 
  SET role = 'admin' 
  WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com');
  ```

---

### Case D: Red Screen Error 500 "Unable to resolve module MaterialSymbols"
* **Fix**:
  This was fixed in `@expo-google-fonts/material-symbols@0.4.49`. Ensure your `node_modules` has the latest patch:
  ```bash
  npm install @expo-google-fonts/material-symbols@0.4.49
  ```

---

## 4. 📦 Building a Standalone Android APK

When you are ready to generate a downloadable `.apk` file that installs directly on an Android device:

1. Install EAS CLI globally (if not installed):
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Run the build (configured in `eas.json`):
   ```bash
   eas build -p android --profile preview
   ```
4. Once completed (~5–10 min), Expo gives you a direct `.apk` download link and QR code.
