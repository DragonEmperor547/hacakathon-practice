# 🏫 Campus Problem Reporting System

A cross-platform web & mobile application built with **React Native (Expo Router)** and **Supabase**. Students can report campus issues (broken equipment, leaks, network failures, etc.) with location, categories, description, and photos, and track resolution timelines. Administrators can review, prioritize, assign status updates, and post admin notes.

---

## 🚀 Features

### 👨‍🎓 Student Portal
- **Authentication**: Sign up and log in securely via Supabase Auth.
- **Submit Complaints**: Report issues with titles, category chips (`Lighting`, `Furniture`, `Water Leakage`, `Cleanliness`, `Equipment`, `Network`), detailed location, descriptions, and optional photo attachments.
- **Image Upload**: Upload complaint photos via `expo-image-picker` with cross-platform base64 arraybuffer decoding to Supabase Storage.
- **My Complaints Dashboard**: Filter by status (`Pending`, `In Progress`, `Resolved`, `Rejected`) with pull-to-refresh support.
- **Resolution Timeline**: Interactive chronological timeline powered by Supabase triggers and `status_history`.

### 🛡️ Admin Control Panel
- **Role-based Redirection**: Secure routing ensuring only administrators access administrative functions.
- **Real-Time Metrics Summary**: Overview count cards for `Pending`, `In Progress`, `Resolved`, and `Active Urgent` issues.
- **Filter & Search**: Full-text search across titles, locations, descriptions, and student reporter names; filterable by Category, Priority, and Status.
- **Urgent Priority Sorting**: Quick toggle to prioritize Urgent issues first.
- **Status & Priority Management**: Update issue status, priority (`Low`, `Medium`, `High`, `Urgent`), and leave public admin remarks.

---

## 🛠️ Tech Stack

| Layer | Choice |
|---|---|
| **App Framework** | [Expo](https://expo.dev) / React Native (Expo Router, TypeScript) |
| **Web & Mobile Support** | React Native Web (`npx expo start --web`) |
| **Backend & Database** | [Supabase](https://supabase.com) (Postgres, Auth, Storage, RLS) |
| **Styling** | React Native StyleSheet with custom color token design system |
| **Image Handling** | `expo-image-picker` + `base64-arraybuffer` |

---

## 🏁 Getting Started

### 1. Prerequisites
- Node.js 18+ and `npm` installed.

### 2. Environment Setup
Create a `.env` file in the root directory (based on `.env.example`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Database & Storage Setup
Execute the SQL statements provided in [`supabase_schema.sql`](file:///f:/hacakathon%20practice/supabase_schema.sql) in your Supabase SQL Editor:
- Creates `profiles`, `complaints`, and `status_history` tables.
- Sets up automated triggers (`handle_new_user`, `log_status_after`, `touch_updated_at`).
- Configures Row Level Security (RLS) policies and `complaint-images` storage bucket.

To promote a registered account to Admin:
```sql
UPDATE public.profiles SET role = 'admin' WHERE id = '<user-uuid>';
```

### 4. Running the Application

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Expo Web App
npm run web

# Or start on mobile device
npx expo start -c
```

---

## 📁 Project Structure

```
├── backend/                  # Supabase Database & Backend Infrastructure
│   ├── schema.sql            # Master schema (v2.0) with upvotes, comments, locations
│   ├── migrations/           # Modular SQL migrations (01 through 05)
│   ├── seed.sql              # Realistic demo seed data with comments & upvotes
│   ├── types/                # Strongly typed database TypeScript interfaces
│   ├── api-contract.md       # Complete API contract for frontend / Figma MCP
│   └── README.md             # Backend architecture & deployment guide
├── frontend/                 # React Native / Expo Web & Mobile Application
│   ├── src/app/              # Expo Router screen hierarchy
│   ├── components/           # UI components (Button, Input, Chips, Badges, Cards...)
│   ├── constants/            # Theme tokens & layout values
│   ├── lib/                  # Supabase client & centralized API helpers
│   ├── types/                # TypeScript interfaces
│   └── package.json          # Frontend dependencies & scripts
├── instruction.md            # Quickstart guide for agents & developers
└── PROJECT_BRIEF.md          # Original hackathon specifications
```

