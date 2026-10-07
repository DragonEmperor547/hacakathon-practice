# 📡 CampusCare — Backend API Contract & Integration Guide

> **FOR THE FRONTEND COLLABORATOR & FIGMA MCP:**  
> This specification documents all Supabase tables, columns, RPC functions, and copy-paste code snippets for building the **CampusCare** mobile application (`https://www.figma.com/design/XQw8JnfhmZd3EkOb35OD0z`).

---

## 🏗️ 1. Architecture Overview
* **Backend Platform:** Supabase (PostgreSQL 15+, Supabase Auth, Storage, Realtime)
* **Client Library:** `@supabase/supabase-js`
* **Realtime Channels Enabled:**
  * `complaints` (Live status, priority, and upvote counter updates)
  * `complaint_comments` (Live two-way student-admin discussion thread)
  * `notifications` (Instant push notification alerts for students)

---

## 🗄️ 2. Database Schema & Tables

### A. `complaints`
Master table of reported campus problems.
| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `uuid` (PK) | `gen_random_uuid()` | Unique complaint identifier |
| `reference_code` | `text` (Unique) | `'CC-' \|\| nextval(...)` | **Human-readable code (e.g. `#CC-1031`, `#CC-1048`)** |
| `user_id` | `uuid` (FK) | — | References `profiles.id` (Reporter) |
| `title` | `text` | — | Problem title |
| `description` | `text` | — | Detailed problem description |
| `category` | `text` | — | `'Lighting'`, `'Furniture'`, `'Water Leakage'`, `'Cleanliness'`, `'Equipment'`, `'Network'` |
| `location` | `text` | — | Human-readable location string |
| `location_id` | `uuid` (FK) | `null` | Optional reference to `campus_locations.id` |
| `image_url` | `text` | `null` | Primary cover photo URL |
| `image_urls` | `text[]` | `'{}'` | **Array of up to 4 photo URLs from storage** |
| `status` | `text` | `'Pending'` | `'Pending'`, `'In Progress'`, `'Resolved'`, `'Rejected'`, `'Withdrawn'` |
| `priority` | `text` | `'Medium'` | `'Low'`, `'Medium'`, `'High'`, `'Urgent'` |
| `assigned_team` | `text` | `null` | **Assigned maintenance department** (e.g. `'Facilities'`, `'Electrical'`, `'Plumbing'`, `'HVAC / Cooling'`, `'IT & Network'`, `'Janitorial'`, `'Carpentry'`) |
| `admin_note` | `text` | `null` | Public remark from administration |
| `upvotes_count` | `integer` | `0` | Automatically maintained by database trigger |
| `created_at` | `timestamptz` | `now()` | Timestamp created |
| `updated_at` | `timestamptz` | `now()` | Timestamp updated |

---

### B. `notifications` (In-App Alert Feed)
Real-time alerts sent to students when their report moves forward or a team is assigned.
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Notification ID |
| `user_id` | `uuid` (FK) | Target student recipient |
| `complaint_id` | `uuid` (FK) | Related complaint |
| `title` | `text` | Alert title (e.g. `"Status Updated: CC-1048"`) |
| `message` | `text` | Alert description (e.g. `"The Electrical department has been assigned."`) |
| `is_read` | `boolean` | Read status (`false` by default) |
| `created_at` | `timestamptz` | Alert timestamp |

---

### C. `complaint_upvotes` ("I Have This Problem Too")
Unique student upvotes per complaint.
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Unique upvote identifier |
| `complaint_id` | `uuid` (FK) | References `complaints.id` |
| `user_id` | `uuid` (FK) | References `profiles.id` |
| `created_at` | `timestamptz` | Timestamp |
* **Constraint:** Unique `(complaint_id, user_id)` — one upvote per student.

---

### D. `complaint_comments` (Two-Way Communication)
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Comment ID |
| `complaint_id` | `uuid` (FK) | Target complaint |
| `user_id` | `uuid` (FK) | Author (`profiles.id`) |
| `message` | `text` | Comment text |
| `is_official` | `boolean` | Automatically set to `true` if author is an admin |
| `created_at` | `timestamptz` | Timestamp |

---

### E. `campus_locations` (Standardized Dropdowns)
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Location ID |
| `building` | `text` | Building / block name |
| `floor` | `text` | Floor |
| `room` | `text` | Specific room, lab, or area |

---

## 💻 3. Frontend Integration Code Snippets (Figma MCP)

### 1. "Similar Issues Nearby" Bottom Sheet Modal (Duplicate Prevention)
When the student enters category or location, query the database to detect existing nearby issues:
```typescript
const { data: similarIssues, error } = await supabase.rpc('find_similar_complaints', {
  p_category: selectedCategory, // e.g. 'Water Leakage'
  p_location: enteredLocation,   // e.g. 'Library 2nd Floor'
  p_exclude_id: null
});

// Returns up to 5 matching active complaints with upvote counts:
// [
//   {
//     id: '...',
//     reference_code: 'CC-1031',
//     title: 'Water leaking from AC ceiling',
//     category: 'Water Leakage',
//     location: 'Central Library, 2nd Floor',
//     status: 'In Progress',
//     upvotes_count: 12,
//     ...
//   }
// ]
```

---

### 2. Multi-Photo Upload & Complaint Submission (Up to 4 Photos)
```typescript
import { decode } from 'base64-arraybuffer';

async function uploadPhotos(userId: string, base64Images: string[]): Promise<string[]> {
  const uploadedUrls: string[] = [];
  
  for (let i = 0; i < base64Images.length; i++) {
    const filePath = `${userId}/${Date.now()}_${i}.jpg`;
    const cleanBase64 = base64Images[i].includes('base64,')
      ? base64Images[i].split('base64,')[1]
      : base64Images[i];

    const { error } = await supabase.storage
      .from('complaint-images')
      .upload(filePath, decode(cleanBase64), {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (!error) {
      const { data } = supabase.storage
        .from('complaint-images')
        .getPublicUrl(filePath);
      uploadedUrls.push(data.publicUrl);
    }
  }
  return uploadedUrls;
}

// Submitting Complaint with multiple photos:
const photoUrls = await uploadPhotos(user.id, selectedBase64Photos);

const { data: newComplaint, error } = await supabase
  .from('complaints')
  .insert({
    user_id: user.id,
    title: title.trim(),
    category: category,
    location: locationText,
    location_id: selectedLocationId || null,
    description: descriptionText,
    image_urls: photoUrls, // Array of up to 4 URLs
    image_url: photoUrls[0] || null // Primary cover thumbnail
  })
  .select()
  .single();

// newComplaint.reference_code will be automatically generated as '#CC-1048'
```

---

### 3. Unified Activity Stream (Status Changes + Two-Way Chat)
Single RPC call returning the blended chronological feed:
```typescript
const { data: activityStream, error } = await supabase.rpc('get_complaint_activity_stream', {
  p_complaint_id: complaintId
});

// activityStream is an array sorted chronologically:
// [
//   {
//     id: '...',
//     entry_type: 'status_change', // Render audit pill or progress checkpoint
//     status: 'In Progress',
//     message: 'Facilities team assigned',
//     is_official: true,
//     author: { full_name: 'Sara Admin', role: 'admin' },
//     created_at: '2026-10-07T...'
//   },
//   {
//     id: '...',
//     entry_type: 'comment',       // Render speech bubble
//     message: 'Electrician arriving this afternoon.',
//     is_official: true,
//     author: { full_name: 'Sara Admin', role: 'admin' },
//     created_at: '2026-10-07T...'
//   }
// ]
```

---

### 4. Trending Feed Query (Most Supported Issues)
```typescript
// Tab: Trending (Orders by highest student upvotes, then recency)
const { data: trendingComplaints, error } = await supabase
  .from('complaints')
  .select(`
    *,
    profiles (full_name, role, avatar_url),
    complaint_upvotes (user_id)
  `)
  .in('status', ['Pending', 'In Progress'])
  .order('upvotes_count', { ascending: false })
  .order('created_at', { ascending: false });
```

---

### 5. Admin Assign Team & Update Status
```typescript
const { data, error } = await supabase
  .from('complaints')
  .update({
    status: 'In Progress',
    priority: 'High',
    assigned_team: 'Electrical', // 'Facilities' | 'Electrical' | 'Plumbing' | 'HVAC / Cooling' | 'IT & Network' | 'Janitorial'
    admin_note: 'Parts ordered. Technician arriving at 2 PM.'
  })
  .eq('id', complaintId)
  .select()
  .single();
// Database trigger will automatically generate a notification for the student!
```

---

### 6. Student In-App Notifications & Realtime Channel
```typescript
// 1. Fetch unread notifications
const { data: notifications, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', currentUserId)
  .order('created_at', { ascending: false });

// 2. Mark notification as read
await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId);

// 3. Listen to live incoming notifications
const notifChannel = supabase
  .channel(`user-notifications-${currentUserId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${currentUserId}`
    },
    (payload) => {
      // Trigger toast or update notification badge count
      console.log('New Notification:', payload.new.title, payload.new.message);
    }
  )
  .subscribe();
```

---

### 7. Toggle Upvote ("I Have This Problem Too")
```typescript
const { data, error } = await supabase.rpc('toggle_complaint_upvote', {
  target_complaint_id: complaintId
});

// data returns: { action: 'added' | 'removed', upvoted: boolean, upvotes_count: number }
```
