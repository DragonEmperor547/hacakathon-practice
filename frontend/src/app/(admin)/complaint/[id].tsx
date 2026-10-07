import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchComplaintById, fetchStatusHistory, updateComplaintAdmin } from '@/lib/api';
import { Complaint, ComplaintPriority, ComplaintStatus, StatusHistory } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Chips } from '@/components/Chips';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { InlineMessage } from '@/components/InlineMessage';
import { COLORS, LAYOUT } from '@/constants/theme';

const STATUSES: ComplaintStatus[] = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES: ComplaintPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export default function AdminComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable Form State
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>('Pending');
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority>('Medium');
  const [adminNote, setAdminNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const [compData, histData] = await Promise.all([
      fetchComplaintById(id as string),
      fetchStatusHistory(id as string),
    ]);
    if (compData) {
      setComplaint(compData);
      setSelectedStatus(compData.status);
      setSelectedPriority(compData.priority);
      setAdminNote(compData.admin_note || '');
    }
    setHistory(histData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSaveChanges = async () => {
    if (!complaint?.id) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await updateComplaintAdmin({
        complaintId: complaint.id,
        status: selectedStatus,
        priority: selectedPriority,
        adminNote: adminNote.trim() || null,
      });

      setComplaint((prev) => (prev ? { ...prev, ...updated } : updated));
      setSuccessMsg('Complaint status updated successfully!');
      
      // Refresh history log
      const newHist = await fetchStatusHistory(complaint.id);
      setHistory(newHist);
    } catch (err: any) {
      console.error('Update failed:', err);
      setErrorMsg(err.message || 'Failed to update complaint.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading complaint details...</Text>
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundTitle}>Complaint Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to Admin Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.badgeRow}>
            <StatusBadge status={complaint.status} size="large" />
            <PriorityBadge priority={complaint.priority} size="medium" />
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{complaint.category}</Text>
            </View>
          </View>
          <Text style={styles.title}>{complaint.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>👤 Reported by: {complaint.profiles?.full_name || 'Student'}</Text>
            <Text style={styles.metaText}>📅 {formatDate(complaint.created_at)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* DETAILS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Location</Text>
          <Text style={styles.sectionBody}>{complaint.location}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Issue Description</Text>
          <Text style={styles.sectionBody}>{complaint.description}</Text>
        </View>

        {complaint.image_url ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📷 Attached Photo</Text>
            <Image source={{ uri: complaint.image_url }} style={styles.image} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* ADMIN ACTION CONTROL PANEL */}
        <View style={styles.adminActionCard}>
          <Text style={styles.adminActionTitle}>⚙️ Admin Update Controls</Text>

          {errorMsg ? <InlineMessage type="error" message={errorMsg} /> : null}
          {successMsg ? <InlineMessage type="success" message={successMsg} /> : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Set Status</Text>
            <Chips
              options={STATUSES}
              selectedValue={selectedStatus}
              onSelect={(val: string) => {
                setSelectedStatus(val as ComplaintStatus);
                setSuccessMsg(null);
              }}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Set Priority</Text>
            <Chips
              options={PRIORITIES}
              selectedValue={selectedPriority}
              onSelect={(val: string) => {
                setSelectedPriority(val as ComplaintPriority);
                setSuccessMsg(null);
              }}
            />
          </View>

          <Input
            label="Admin Note / Remark (Visible to student)"
            placeholder="e.g. Technician dispatched. Estimated fix time: 2 PM."
            multiline
            numberOfLines={3}
            value={adminNote}
            onChangeText={(text: string) => {
              setAdminNote(text);
              setSuccessMsg(null);
            }}
            style={styles.textArea}
          />

          <Button
            title="Save & Update Status"
            onPress={handleSaveChanges}
            loading={saving}
            style={styles.saveBtn}
          />
        </View>

        <View style={styles.divider} />

        {/* TIMELINE LOG */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏳ Status History Log</Text>
          <View style={styles.timelineContainer}>
            {history.length === 0 ? (
              <Text style={styles.noHistoryText}>No status log recorded yet.</Text>
            ) : (
              history.map((item, index) => {
                const isLast = index === history.length - 1;
                return (
                  <View key={item.id} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineDot,
                          isLast && { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
                        ]}
                      />
                      {!isLast ? <View style={styles.timelineLine} /> : null}
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <StatusBadge status={item.status} size="small" />
                        <Text style={styles.timelineDate}>{formatDate(item.changed_at)}</Text>
                      </View>
                      {item.note ? (
                        <Text style={styles.timelineNote}>"{item.note}"</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 24,
    paddingHorizontal: LAYOUT.paddingHorizontal,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  card: {
    width: '100%',
    maxWidth: LAYOUT.maxWidth,
    backgroundColor: COLORS.cardBackground,
    borderRadius: LAYOUT.cardRadius,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerInfo: {
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryTag: {
    backgroundColor: COLORS.categoryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.categoryText,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  image: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
    marginTop: 6,
  },
  adminActionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  adminActionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: 8,
  },
  timelineContainer: {
    marginTop: 10,
    paddingLeft: 4,
  },
  noHistoryText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.border,
    borderWidth: 2,
    borderColor: COLORS.cardBackground,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  timelineNote: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
