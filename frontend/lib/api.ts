import { supabase } from './supabase';
import {
  CampusLocation,
  Complaint,
  ComplaintComment,
  ComplaintPriority,
  ComplaintStatus,
  Profile,
  StatusHistory,
} from '../types';
import { decode } from 'base64-arraybuffer';

// Helper to format short human-readable reference IDs (#CC-XXXX)
export function getComplaintReference(complaint: { id: string; reference_code?: string }): string {
  if (complaint.reference_code) {
    return complaint.reference_code.startsWith('#')
      ? complaint.reference_code
      : `#${complaint.reference_code}`;
  }
  // Generate stable deterministic 4-digit code from UUID if backend hasn't generated one
  const cleanId = complaint.id.replace(/-/g, '');
  const shortNum = (parseInt(cleanId.slice(0, 6), 16) % 9000) + 1000;
  return `#CC-${shortNum}`;
}

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

// COMPLAINTS APIs (Community / Student Feed)
export async function fetchComplaintsWithUpvotes(currentUserId?: string): Promise<Complaint[]> {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select(`
        *,
        profiles (
          full_name,
          role,
          avatar_url
        ),
        complaint_upvotes (
          user_id
        ),
        complaint_comments (
          id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Falling back to basic complaints select:', error.message);
      const fallback = await supabase
        .from('complaints')
        .select('*, profiles(full_name, role)')
        .order('created_at', { ascending: false });
      return (fallback.data || []).map((c: any) => ({
        ...c,
        upvotes_count: c.upvotes_count || 0,
        has_user_upvoted: false,
        comments_count: 0,
      })) as Complaint[];
    }

    return (data || []).map((item: any) => {
      const has_user_upvoted = currentUserId
        ? item.complaint_upvotes?.some((u: { user_id: string }) => u.user_id === currentUserId)
        : false;

      return {
        ...item,
        upvotes_count: item.upvotes_count ?? (item.complaint_upvotes?.length || 0),
        has_user_upvoted,
        comments_count: item.complaint_comments?.length || 0,
      };
    }) as Complaint[];
  } catch (err) {
    console.error('Error fetching complaints:', err);
    return [];
  }
}

export async function fetchStudentComplaints(userId: string): Promise<Complaint[]> {
  const all = await fetchComplaintsWithUpvotes(userId);
  return all.filter((c) => c.user_id === userId);
}

export async function fetchComplaintById(
  complaintId: string,
  currentUserId?: string
): Promise<Complaint | null> {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select(`
        *,
        profiles (
          full_name,
          role,
          avatar_url
        ),
        complaint_upvotes (
          user_id
        ),
        complaint_comments (
          id
        )
      `)
      .eq('id', complaintId)
      .single();

    if (error || !data) {
      // Basic fallback
      const { data: basic, error: basicError } = await supabase
        .from('complaints')
        .select('*, profiles(full_name, role)')
        .eq('id', complaintId)
        .single();
      if (basicError) throw basicError;
      return basic as Complaint;
    }

    const has_user_upvoted = currentUserId
      ? data.complaint_upvotes?.some((u: { user_id: string }) => u.user_id === currentUserId)
      : false;

    return {
      ...data,
      upvotes_count: data.upvotes_count ?? (data.complaint_upvotes?.length || 0),
      has_user_upvoted,
      comments_count: data.complaint_comments?.length || 0,
    } as Complaint;
  } catch (err) {
    console.error('Error fetching complaint by id:', err);
    return null;
  }
}

export async function createComplaint(complaintData: {
  user_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  location_id?: string | null;
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

// TOGGLE UPVOTE ("I Have This Problem Too")
export async function toggleComplaintUpvote(
  complaintId: string,
  userId: string
): Promise<{ upvoted: boolean; upvotes_count: number }> {
  try {
    // Attempt database atomic RPC function first
    const { data, error } = await supabase.rpc('toggle_complaint_upvote', {
      target_complaint_id: complaintId,
    });

    if (!error && data) {
      return {
        upvoted: Boolean(data.upvoted),
        upvotes_count: Number(data.upvotes_count),
      };
    }
  } catch {
    // Fall back to table manipulation if RPC has not been executed in SQL Editor
  }

  // Client-side fallback:
  const { data: existing } = await supabase
    .from('complaint_upvotes')
    .select('id')
    .eq('complaint_id', complaintId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('complaint_upvotes').delete().eq('id', existing.id);
    const { count } = await supabase
      .from('complaint_upvotes')
      .select('id', { count: 'exact', head: true })
      .eq('complaint_id', complaintId);
    return { upvoted: false, upvotes_count: count || 0 };
  } else {
    await supabase.from('complaint_upvotes').insert([{ complaint_id: complaintId, user_id: userId }]);
    const { count } = await supabase
      .from('complaint_upvotes')
      .select('id', { count: 'exact', head: true })
      .eq('complaint_id', complaintId);
    return { upvoted: true, upvotes_count: count || 1 };
  }
}

// TWO-WAY COMMENTS & DISCUSSION THREAD
export async function fetchComplaintComments(complaintId: string): Promise<ComplaintComment[]> {
  const { data, error } = await supabase
    .from('complaint_comments')
    .select(`
      id,
      complaint_id,
      user_id,
      message,
      is_official,
      created_at,
      profiles (
        full_name,
        role,
        avatar_url
      )
    `)
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
  return (data || []).map((c: any) => ({
    ...c,
    profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
  })) as ComplaintComment[];
}

export async function postComplaintComment(
  complaintId: string,
  userId: string,
  message: string,
  isAdmin: boolean = false
): Promise<ComplaintComment> {
  const { data, error } = await supabase
    .from('complaint_comments')
    .insert({
      complaint_id: complaintId,
      user_id: userId,
      message: message.trim(),
      is_official: isAdmin,
    })
    .select(`
      *,
      profiles (
        full_name,
        role,
        avatar_url
      )
    `)
    .single();

  if (error) {
    console.error('Error posting comment:', error);
    throw error;
  }
  return {
    ...data,
    profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
  } as ComplaintComment;
}

// REALTIME SUBSCRIPTION FOR COMMENTS
export function subscribeToComplaintComments(
  complaintId: string,
  onComment: (comment: ComplaintComment) => void
) {
  return supabase
    .channel(`comments-${complaintId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'complaint_comments',
        filter: `complaint_id=eq.${complaintId}`,
      },
      async (payload) => {
        const { data: author } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url')
          .eq('id', payload.new.user_id)
          .single();

        const fullComment = {
          ...payload.new,
          profiles: author,
        } as ComplaintComment;

        onComment(fullComment);
      }
    )
    .subscribe();
}

// DUPLICATE PREVENTER / SIMILAR ISSUES NEARBY
export async function findSimilarComplaints(
  category: string,
  location: string,
  excludeId?: string
): Promise<Complaint[]> {
  try {
    const all = await fetchComplaintsWithUpvotes();
    const locClean = location.toLowerCase().trim();

    return all.filter((c) => {
      if (excludeId && c.id === excludeId) return false;
      if (c.status === 'Resolved' || c.status === 'Withdrawn') return false;

      const sameCategory = c.category === category;
      const cLoc = c.location.toLowerCase();
      const locationMatch =
        locClean.length > 3 && (cLoc.includes(locClean) || locClean.includes(cLoc));

      return sameCategory || locationMatch;
    }).slice(0, 3);
  } catch (e) {
    console.error('Error finding similar complaints:', e);
    return [];
  }
}

// CAMPUS STANDARDIZED LOCATIONS
export async function fetchCampusLocations(): Promise<CampusLocation[]> {
  const { data, error } = await supabase
    .from('campus_locations')
    .select('*')
    .order('building', { ascending: true });

  if (error) {
    // Return sample university locations if table not yet seeded
    return [
      { id: '1', building: 'Science Hall', floor: 'Ground Floor', room: 'Lab 3' },
      { id: '2', building: 'Block B (Engineering)', floor: 'Level 2', room: 'Room 204' },
      { id: '3', building: 'Main Library', floor: 'Level 4', room: 'Quiet Study Hall' },
      { id: '4', building: 'Student Center', floor: '1st Floor', room: 'Cafeteria' },
      { id: '5', building: 'Sports Complex', floor: 'Ground Floor', room: 'Gymnasium' },
    ];
  }
  return data as CampusLocation[];
}

// STUDENT ACTIONS (Self-resolve and Withdraw)
export async function selfResolveComplaint(
  complaintId: string,
  remark: string = 'Resolved on-site by student'
): Promise<void> {
  const { error } = await supabase.rpc('self_resolve_my_complaint', {
    target_complaint_id: complaintId,
    remark,
  });

  if (error) {
    // Fallback update
    await supabase
      .from('complaints')
      .update({ status: 'Resolved', admin_note: remark, updated_at: new Date().toISOString() })
      .eq('id', complaintId);
  }
}

export async function withdrawComplaint(
  complaintId: string,
  reason: string = 'Withdrawn by student'
): Promise<void> {
  const { error } = await supabase.rpc('withdraw_my_complaint', {
    target_complaint_id: complaintId,
    reason,
  });

  if (error) {
    // Fallback update
    await supabase
      .from('complaints')
      .update({ status: 'Withdrawn', admin_note: reason, updated_at: new Date().toISOString() })
      .eq('id', complaintId);
  }
}

// ADMIN APIs
export async function fetchAllComplaints(currentUserId?: string): Promise<Complaint[]> {
  return fetchComplaintsWithUpvotes(currentUserId);
}

export async function updateComplaintAdmin({
  complaintId,
  status,
  priority,
  adminNote,
  assignedTeam,
}: {
  complaintId: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  adminNote?: string | null;
  assignedTeam?: string | null;
}): Promise<Complaint> {
  const updatePayload: Record<string, any> = {
    status,
    priority,
    admin_note: adminNote,
  };
  if (assignedTeam !== undefined) {
    updatePayload.assigned_team = assignedTeam;
  }

  const { data, error } = await supabase
    .from('complaints')
    .update(updatePayload)
    .eq('id', complaintId)
    .select('*, profiles(full_name, role)')
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

// IMAGE UPLOAD API (Cross-platform base64)
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
