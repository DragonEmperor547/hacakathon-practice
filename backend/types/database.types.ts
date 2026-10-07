export type UserRole = 'student' | 'admin';

export type ComplaintCategory =
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

export type DepartmentTeam =
  | 'Facilities'
  | 'Electrical'
  | 'Plumbing'
  | 'HVAC / Cooling'
  | 'IT & Network'
  | 'Janitorial'
  | 'Carpentry'
  | 'General Maintenance';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  avatar_url?: string | null;
  created_at: string;
}

export interface CampusLocation {
  id: string;
  building: string;
  floor: string;
  room: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  reference_code: string;
  user_id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  location: string;
  location_id?: string | null;
  image_url?: string | null;
  image_urls?: string[];
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assigned_team?: DepartmentTeam | null;
  admin_note?: string | null;
  upvotes_count: number;
  created_at: string;
  updated_at: string;
  // Joined relations
  profiles?: {
    full_name: string | null;
    role: UserRole;
    avatar_url?: string | null;
  } | null;
  campus_locations?: CampusLocation | null;
  has_user_upvoted?: boolean;
}

export interface ComplaintUpvote {
  id: string;
  complaint_id: string;
  user_id: string;
  created_at: string;
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
    role: UserRole;
    avatar_url?: string | null;
  } | null;
}

export interface StatusHistory {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  note?: string | null;
  changed_by?: string | null;
  changed_at: string;
  profiles?: {
    full_name: string | null;
    role: UserRole;
  } | null;
}

export interface Notification {
  id: string;
  user_id: string;
  complaint_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ActivityStreamItem {
  id: string;
  entry_type: 'status_change' | 'comment';
  status?: ComplaintStatus | null;
  message: string;
  is_official: boolean;
  user_id: string;
  author: {
    id: string;
    full_name: string | null;
    role: UserRole;
    avatar_url?: string | null;
  };
  created_at: string;
}

export interface SimilarComplaint {
  id: string;
  reference_code: string;
  title: string;
  category: ComplaintCategory;
  location: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  image_url?: string | null;
  upvotes_count: number;
  created_at: string;
}

export interface ToggleUpvoteResult {
  action: 'added' | 'removed';
  upvoted: boolean;
  upvotes_count: number;
}
