export type UserRole = 'student' | 'admin';

export type Category =
  | 'Lighting'
  | 'Furniture'
  | 'Water Leakage'
  | 'Cleanliness'
  | 'Equipment'
  | 'Network';

export type ComplaintStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Complaint {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: Category;
  location: string;
  image_url: string | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    role: string;
  } | null;
}

export interface StatusHistory {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  note: string | null;
  changed_at: string;
}
