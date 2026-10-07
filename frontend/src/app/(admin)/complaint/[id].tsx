import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { Complaint, ComplaintPriority, ComplaintStatus, StatusHistory } from '@/types';
import {
  fetchComplaintById,
  fetchStatusHistory,
  getComplaintReference,
  updateComplaintAdmin,
} from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import {
  ArrowLeftIcon,
  CATEGORY_ICONS,
  CommentIcon,
  PinIcon,
  ShieldIcon,
} from '@/components/Icons';
import { ActivityCommentsModal } from '@/components/ActivityCommentsModal';

const STATUSES: ComplaintStatus[] = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES: ComplaintPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const TEAMS = [
  'Facilities',
  'Plumbing',
  'Electrical',
  'HVAC / Cooling',
  'IT & Network',
  'Janitorial',
];

export default function AdminComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Update Form States
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('Pending');
  const [newPriority, setNewPriority] = useState<ComplaintPriority>('Medium');
  const [assignedTeam, setAssignedTeam] = useState<string>('Facilities');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [showCommentsModal, setShowCommentsModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [compData, histData] = await Promise.all([
        fetchComplaintById(id),
        fetchStatusHistory(id),
      ]);
      if (compData) {
        setComplaint(compData);
        setNewStatus(compData.status);
        setNewPriority(compData.priority);
        setAssignedTeam(compData.assigned_team || 'Facilities');
        setAdminNote(compData.admin_note || '');
      }
      setHistory(histData);
    } catch (e) {
      console.error('Error loading admin complaint details:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdate = async () => {
    if (!complaint) return;
    setSaving(true);

    try {
      const updated = await updateComplaintAdmin({
        complaintId: complaint.id,
        status: newStatus,
        priority: newPriority,
        adminNote: adminNote.trim() || null,
        assignedTeam,
      });

      setComplaint(updated);
      await loadData();
      Alert.alert('Success', 'Complaint updated successfully and student notified.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update complaint.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'SR';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) +
        ' · ' +
        d.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        })
      );
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Complaint not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const refCode = getComplaintReference(complaint);
  const reporterName = complaint.profiles?.full_name || 'Student Reporter';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backHeaderBtn}
          activeOpacity={0.7}
        >
          <ArrowLeftIcon size={18} color={COLORS.textPrimary} />
          <Text style={styles.backHeaderText}>Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.topBarRef}>{refCode}</Text>

        <TouchableOpacity
          style={styles.chatHeaderBtn}
          onPress={() => setShowCommentsModal(true)}
        >
          <CommentIcon size={16} color={COLORS.primary} />
          <Text style={styles.chatHeaderText}>Chat</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Summary Card */}
        <View style={styles.headerCard}>
          <View style={styles.metaRow}>
            <Text style={styles.refCodeText}>COMPLAINT {refCode}</Text>
            <View style={styles.badgeRow}>
              <StatusBadge status={complaint.status} size="small" />
              <PriorityBadge priority={complaint.priority} size="small" />
            </View>
          </View>

          <Text style={styles.title}>{complaint.title}</Text>

          <View style={styles.tagLocationRow}>
            <Text style={styles.categoryBadge}>
              {CATEGORY_ICONS[complaint.category]} {complaint.category}
            </Text>
            <Text style={styles.bullet}>·</Text>
            <PinIcon size={12} color={COLORS.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {complaint.location}
            </Text>
          </View>

          <Text style={styles.dateReported}>
            Reported on {formatDateTime(complaint.created_at)}
          </Text>
        </View>

        {/* Student Reporter Profile Card (Figma screen 2:18279) */}
        <View style={styles.reporterCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(reporterName)}</Text>
          </View>

          <View style={styles.reporterMeta}>
            <Text style={styles.reporterName}>{reporterName}</Text>
            <Text style={styles.reporterRoleText}>Student reporter</Text>
          </View>

          <TouchableOpacity
            style={styles.messageStudentBtn}
            onPress={() => setShowCommentsModal(true)}
          >
            <Text style={styles.messageStudentText}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Description & Photo Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{complaint.description}</Text>

          {complaint.image_url ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: complaint.image_url }}
                style={styles.issueImage}
                resizeMode="cover"
              />
            </View>
          ) : null}
        </View>

        {/* Activity Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Activity Timeline</Text>
          <View style={styles.timelineList}>
            {history.map((h, i) => (
              <View
                key={h.id || i}
                style={[
                  styles.timelineItem,
                  i === history.length - 1 && { borderLeftColor: 'transparent' },
                ]}
              >
                <View style={styles.timelineDot} />
                <View style={styles.timelineBody}>
                  <View style={styles.timelineHead}>
                    <Text style={styles.timelineStatus}>{h.status}</Text>
                    <Text style={styles.timelineTime}>
                      {formatDateTime(h.changed_at)}
                    </Text>
                  </View>
                  <Text style={styles.timelineNote}>
                    {h.note || `Status marked as ${h.status}.`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Update Complaint Admin Workspace */}
        <View style={styles.actionWorkspaceCard}>
          <View style={styles.workspaceHeader}>
            <ShieldIcon size={18} color={COLORS.primary} />
            <View>
              <Text style={styles.workspaceTitle}>Update complaint</Text>
              <Text style={styles.workspaceSubtitle}>
                Changes are shared with the reporter.
              </Text>
            </View>
          </View>

          {/* 1. Status Picker */}
          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.pickerRow}>
            {STATUSES.map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.pickerPill,
                  newStatus === st && styles.pickerPillActive,
                ]}
                onPress={() => setNewStatus(st)}
              >
                <Text
                  style={[
                    styles.pickerPillText,
                    newStatus === st && styles.pickerPillTextActive,
                  ]}
                >
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 2. Priority Picker */}
          <Text style={styles.fieldLabel}>Priority</Text>
          <View style={styles.pickerRow}>
            {PRIORITIES.map((pr) => (
              <TouchableOpacity
                key={pr}
                style={[
                  styles.pickerPill,
                  newPriority === pr && styles.pickerPillActive,
                ]}
                onPress={() => setNewPriority(pr)}
              >
                <Text
                  style={[
                    styles.pickerPillText,
                    newPriority === pr && styles.pickerPillTextActive,
                  ]}
                >
                  {pr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 3. Assigned Team Picker */}
          <Text style={styles.fieldLabel}>Assigned team</Text>
          <View style={styles.pickerRow}>
            {TEAMS.map((tm) => (
              <TouchableOpacity
                key={tm}
                style={[
                  styles.pickerPill,
                  assignedTeam === tm && styles.pickerPillActive,
                ]}
                onPress={() => setAssignedTeam(tm)}
              >
                <Text
                  style={[
                    styles.pickerPillText,
                    assignedTeam === tm && styles.pickerPillTextActive,
                  ]}
                >
                  {tm}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 4. Admin Note */}
          <Text style={styles.fieldLabel}>Admin note</Text>
          <TextInput
            style={styles.adminNoteInput}
            placeholder="e.g. Facilities has isolated the area. A plumber is scheduled for 4:30 PM today."
            placeholderTextColor={COLORS.textMuted}
            value={adminNote}
            onChangeText={setAdminNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Submit Update Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Discussion Chat Modal */}
      <ActivityCommentsModal
        visible={showCommentsModal}
        complaint={complaint}
        onClose={() => setShowCommentsModal(false)}
        onComplaintUpdated={(u) => setComplaint(u)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '700',
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  backHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  topBarRef: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  chatHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chatHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 24,
    marginBottom: 10,
  },
  tagLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.categoryText,
  },
  bullet: {
    color: COLORS.textMuted,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  dateReported: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  reporterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  reporterMeta: {
    flex: 1,
  },
  reporterName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reporterRoleText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  messageStudentBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  messageStudentText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  issueImage: {
    width: '100%',
    height: 200,
  },
  timelineList: {
    paddingLeft: 4,
    marginTop: 4,
  },
  timelineItem: {
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 14,
    paddingBottom: 16,
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -6,
    top: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  timelineBody: {
    flex: 1,
  },
  timelineHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timelineStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  timelineTime: {
    fontSize: 10.5,
    color: COLORS.textMuted,
  },
  timelineNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  actionWorkspaceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 24,
  },
  workspaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  workspaceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  workspaceSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  pickerPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pickerPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pickerPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  adminNoteInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    height: 80,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
