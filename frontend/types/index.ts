export type UserRole = 'student' | 'admin';

export type Category =
  | 'Lighting'
  | 'Furniture'
  | 'Water Leakage'
  | 'Cleanliness'
  | 'Equipment'
  | 'Network';

export type ComplaintStatus =
  | 'Pending'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected'
  | 'Withdrawn';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  avatar_url?: string | null;
  created_at?: string;
}

export interface Complaint {
  id: string;
  reference_code?: string;
  user_id: string;
  title: string;
  description: string;
  category: Category;
  location: string;
  location_id?: string | null;
  image_url: string | null;
  image_urls?: string[];
  status: ComplaintStatus;
  priority: ComplaintPriority;
  admin_note: string | null;
  assigned_team?: string | null;
  upvotes_count: number;
  has_user_upvoted?: boolean;
  comments_count?: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    role: string;
    avatar_url?: string | null;
  } | null;
}

export interface StatusHistory {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  note: string | null;
  changed_by?: string | null;
  changed_at: string;
}

export interface ComplaintComment {
  id: string;
  complaint_id: string;
  user_id: string;
  message: string;
  is_official: boolean;
  created_at: string;
  profiles?: {
    full_name: string | null;
    role: string;
    avatar_url?: string | null;
  } | null;
}

export interface CampusLocation {
  id: string;
  building: string;
  floor: string;
  room: string;
}
