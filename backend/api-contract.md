# 📡 Campus Complaints — Backend API Contract & Integration Guide

> **FOR THE FRONTEND COLLABORATOR & FIGMA MCP:**  
> This document specifies all Supabase tables, columns, RPC functions, and ready-to-use JavaScript/TypeScript query snippets for building UI components with Figma MCP.

---

## 🏗️ 1. Architecture Overview
* **Backend Platform:** Supabase (PostgreSQL 15+, Supabase Auth, Storage, Realtime)
* **Client Library:** `@supabase/supabase-js`
* **Realtime Support:** Enabled on `complaints` and `complaint_comments`

---

## 🗄️ 2. Database Schema & Tables

### A. `profiles`
Created automatically on sign up via database trigger.
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | References `auth.users(id)` |
| `full_name` | `text` | Display name of the student or admin |
| `role` | `text` | `'student'` or `'admin'` |
| `avatar_url` | `text` | Optional profile image URL |
| `created_at` | `timestamptz` | Registration timestamp |

---

### B. `complaints`
Master table of reported campus problems.
| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `uuid` (PK) | `gen_random_uuid()` | Unique complaint identifier |
| `user_id` | `uuid` (FK) | — | References `profiles.id` (Reporter) |
| `title` | `text` | — | Short problem title |
| `description` | `text` | — | Detailed problem description |
| `category` | `text` | — | `'Lighting'`, `'Furniture'`, `'Water Leakage'`, `'Cleanliness'`, `'Equipment'`, `'Network'` |
| `location` | `text` | — | Human-readable location string |
| `location_id` | `uuid` (FK) | `null` | Optional reference to `campus_locations.id` |
| `image_url` | `text` | `null` | Public photo URL from `complaint-images` bucket |
| `status` | `text` | `'Pending'` | `'Pending'`, `'In Progress'`, `'Resolved'`, `'Rejected'`, `'Withdrawn'` |
| `priority` | `text` | `'Medium'` | `'Low'`, `'Medium'`, `'High'`, `'Urgent'` |
| `admin_note` | `text` | `null` | Public note from administration |
| `upvotes_count` | `integer` | `0` | Automatically updated by database trigger |
| `created_at` | `timestamptz` | `now()` | Timestamp created |
| `updated_at` | `timestamptz` | `now()` | Automatically updated by trigger on edit |

---

### C. `complaint_upvotes` ("I Have This Problem Too")
Tracks unique upvotes per student per complaint.
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Unique upvote identifier |
| `complaint_id` | `uuid` (FK) | References `complaints.id` |
| `user_id` | `uuid` (FK) | References `profiles.id` |
| `created_at` | `timestamptz` | Timestamp |
* **Constraint:** Unique `(complaint_id, user_id)` — one upvote per user.

---

### D. `complaint_comments` (Two-Way Communication Thread)
Live discussion thread between student and administration.
| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `uuid` (PK) | `gen_random_uuid()` | Comment ID |
| `complaint_id` | `uuid` (FK) | — | Target complaint |
| `user_id` | `uuid` (FK) | — | Author (`profiles.id`) |
| `message` | `text` | — | Comment content |
| `is_official` | `boolean` | `false` | Automatically set to `true` if author is an admin |
| `created_at` | `timestamptz` | `now()` | Timestamp |

---

### E. `campus_locations` (Standardized Dropdowns)
Standardized building, floor, and room records.
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Location ID |
| `building` | `text` | e.g. `'Block A (Engineering)'`, `'Central Library'` |
| `floor` | `text` | e.g. `'Ground Floor'`, `'1st Floor'`, `'2nd Floor'` |
| `room` | `text` | e.g. `'Room 204'`, `'Computer Lab 1'` |

---

### F. `status_history` (Audit Log & Timeline)
Populated automatically by database triggers on status changes.
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | History log ID |
| `complaint_id` | `uuid` (FK) | Target complaint |
| `status` | `text` | The new status assigned |
| `note` | `text` | Remarks or admin note at that step |
| `changed_by` | `uuid` (FK) | User who made the change |
| `changed_at` | `timestamptz` | Timestamp |

---

## 💻 3. Frontend Integration Code Snippets

### 1. Toggle Upvote ("I Have This Problem Too")
Call the atomic database RPC function:
```typescript
const { data, error } = await supabase.rpc('toggle_complaint_upvote', {
  target_complaint_id: complaintId
});

// data returns: { action: 'added' | 'removed', upvoted: boolean, upvotes_count: number }
if (!error) {
  console.log(`New upvote count: ${data.upvotes_count}, Upvoted: ${data.upvoted}`);
}
```

---

### 2. Fetch Complaints (With Reporter Name & Check If Current User Upvoted)
```typescript
const { data, error } = await supabase
  .from('complaints')
  .select(`
    *,
    profiles (full_name, role, avatar_url),
    complaint_upvotes (user_id)
  `)
  .order('created_at', { ascending: false });

// Compute has_user_upvoted on client:
const complaints = data?.map(item => ({
  ...item,
  has_user_upvoted: item.complaint_upvotes?.some(
    (u: { user_id: string }) => u.user_id === currentUserId
  )
}));
```

---

### 3. Fetch Comments for a Complaint
```typescript
const { data: comments, error } = await supabase
  .from('complaint_comments')
  .select(`
    id,
    message,
    is_official,
    created_at,
    user_id,
    profiles (full_name, role, avatar_url)
  `)
  .eq('complaint_id', complaintId)
  .order('created_at', { ascending: true });
```

---

### 4. Post a New Comment
```typescript
const { data, error } = await supabase
  .from('complaint_comments')
  .insert({
    complaint_id: complaintId,
    user_id: currentUserId,
    message: text.trim()
  })
  .select(`
    *,
    profiles (full_name, role, avatar_url)
  `)
  .single();
```

---

### 5. Listen to Live Comments in Realtime
```typescript
const commentsChannel = supabase
  .channel(`complaint-${complaintId}-comments`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'complaint_comments',
      filter: `complaint_id=eq.${complaintId}`
    },
    async (payload) => {
      // Fetch full profile info for new comment
      const { data: author } = await supabase
        .from('profiles')
        .select('full_name, role, avatar_url')
        .eq('id', payload.new.user_id)
        .single();
      
      const newComment = { ...payload.new, profiles: author };
      setComments(prev => [...prev, newComment]);
    }
  )
  .subscribe();

// Don't forget to unsubscribe on component unmount:
// supabase.removeChannel(commentsChannel);
```

---

### 6. Fetch Campus Locations for Hierarchical Dropdowns
```typescript
const { data: locations, error } = await supabase
  .from('campus_locations')
  .select('id, building, floor, room')
  .order('building', { ascending: true });

// Extract distinct buildings:
const buildings = [...new Set(locations?.map(l => l.building))];

// Filter floors for selected building:
const getFloors = (building: string) => [
  ...new Set(locations?.filter(l => l.building === building).map(l => l.floor))
];

// Filter rooms for selected floor:
const getRooms = (building: string, floor: string) => 
  locations?.filter(l => l.building === building && l.floor === floor) || [];
```

---

### 7. Student Self-Resolve or Withdraw Complaint
```typescript
// Option A: Self-resolve
const { data, error } = await supabase.rpc('self_resolve_my_complaint', {
  target_complaint_id: complaintId,
  remark: 'Fixed by student on-site'
});

// Option B: Withdraw
const { data, error } = await supabase.rpc('withdraw_my_complaint', {
  target_complaint_id: complaintId,
  reason: 'Reported by mistake'
});
```

---

### 8. Admin Update Complaint Status & Priority
```typescript
const { data, error } = await supabase
  .from('complaints')
  .update({
    status: newStatus,       // 'Pending' | 'In Progress' | 'Resolved' | 'Rejected'
    priority: newPriority,   // 'Low' | 'Medium' | 'High' | 'Urgent'
    admin_note: noteText
  })
  .eq('id', complaintId)
  .select()
  .single();
```

---

### 9. Upload Complaint Image to Storage
```typescript
import { decode } from 'base64-arraybuffer';

async function uploadImage(userId: string, base64Data: string): Promise<string> {
  const filePath = `${userId}/${Date.now()}.jpg`;
  const cleanBase64 = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
  const arrayBuffer = decode(cleanBase64);

  const { error } = await supabase.storage
    .from('complaint-images')
    .upload(filePath, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('complaint-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
```
