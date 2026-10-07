import { supabase } from './supabase';
import { Complaint, ComplaintPriority, ComplaintStatus, Profile, StatusHistory } from '../types';
import { decode } from 'base64-arraybuffer';

// AUTH APIs
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data as Profile;
}

// COMPLAINTS APIs (Student)
export async function fetchStudentComplaints(userId: string): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching student complaints:', error);
    throw error;
  }
  return data as Complaint[];
}

export async function fetchComplaintById(complaintId: string): Promise<Complaint | null> {
  const { data, error } = await supabase
    .from('complaints')
    .select(`
      *,
      profiles (
        full_name,
        role
      )
    `)
    .eq('id', complaintId)
    .single();

  if (error) {
    console.error('Error fetching complaint by id:', error);
    return null;
  }
  return data as Complaint;
}

export async function createComplaint(complaintData: {
  user_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  image_url?: string | null;
}): Promise<Complaint> {
  const { data, error } = await supabase
    .from('complaints')
    .insert([complaintData])
    .select()
    .single();

  if (error) {
    console.error('Error creating complaint:', error);
    throw error;
  }
  return data as Complaint;
}

// COMPLAINTS APIs (Admin)
export async function fetchAllComplaints(): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select(`
      *,
      profiles (
        full_name,
        role
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all complaints for admin:', error);
    throw error;
  }
  return data as Complaint[];
}

export async function updateComplaintAdmin({
  complaintId,
  status,
  priority,
  adminNote,
}: {
  complaintId: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  adminNote?: string | null;
}): Promise<Complaint> {
  const { data, error } = await supabase
    .from('complaints')
    .update({
      status,
      priority,
      admin_note: adminNote,
    })
    .eq('id', complaintId)
    .select()
    .single();

  if (error) {
    console.error('Error updating complaint:', error);
    throw error;
  }
  return data as Complaint;
}

// STATUS HISTORY Timeline API
export async function fetchStatusHistory(complaintId: string): Promise<StatusHistory[]> {
  const { data, error } = await supabase
    .from('status_history')
    .select('*')
    .eq('complaint_id', complaintId)
    .order('changed_at', { ascending: true });

  if (error) {
    console.error('Error fetching status history:', error);
    return [];
  }
  return data as StatusHistory[];
}

// IMAGE UPLOAD API (Cross-platform Expo base64 to Supabase storage)
export async function uploadComplaintImage(
  userId: string,
  base64Data: string
): Promise<string> {
  const timestamp = Date.now();
  const filePath = `${userId}/${timestamp}.jpg`;
  
  const cleanBase64 = base64Data.includes('base64,')
    ? base64Data.split('base64,')[1]
    : base64Data;

  const arrayBuffer = decode(cleanBase64);

  const { error: uploadError } = await supabase.storage
    .from('complaint-images')
    .upload(filePath, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    console.error('Image upload failed:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('complaint-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
