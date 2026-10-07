import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/theme';
import { Complaint, StatusHistory } from '@/types';
import {
  fetchComplaintById,
  fetchStatusHistory,
  getComplaintReference,
  selfResolveComplaint,
  toggleComplaintUpvote,
  withdrawComplaint,
} from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import {
  ArrowLeftIcon,
  CATEGORY_ICONS,
  CheckIcon,
  CommentIcon,
  PinIcon,
  ShieldIcon,
  UpvoteIcon,
} from '@/components/Icons';
import { ActivityCommentsModal } from '@/components/ActivityCommentsModal';

export default function StudentComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [togglingUpvote, setTogglingUpvote] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [compData, histData] = await Promise.all([
        fetchComplaintById(id, user?.id),
        fetchStatusHistory(id),
      ]);
      setComplaint(compData);
      setHistory(histData);
    } catch (e) {
      console.error('Error loading complaint details:', e);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleUpvote = async () => {
    if (!complaint || !user || togglingUpvote) return;
    setTogglingUpvote(true);

    const currentlyUpvoted = Boolean(complaint.has_user_upvoted);
    const newUpvoted = !currentlyUpvoted;
    const newCount = (complaint.upvotes_count || 0) + (newUpvoted ? 1 : -1);

    setComplaint({
      ...complaint,
      has_user_upvoted: newUpvoted,
      upvotes_count: Math.max(0, newCount),
    });

    try {
      const res = await toggleComplaintUpvote(complaint.id, user.id);
      setComplaint((prev) =>
        prev
          ? {
              ...prev,
              has_user_upvoted: res.upvoted,
              upvotes_count: res.upvotes_count,
            }
          : prev
      );
    } catch (e) {
      console.error('Failed to toggle upvote:', e);
      setComplaint({
        ...complaint,
        has_user_upvoted: currentlyUpvoted,
        upvotes_count: complaint.upvotes_count,
      });
    } finally {
      setTogglingUpvote(false);
    }
  };

  const handleSelfResolve = () => {
    if (!complaint) return;
    Alert.alert(
      'Mark as Resolved?',
      'Confirm that this issue has been resolved on-site.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Mark Resolved',
          onPress: async () => {
            setActionLoading(true);
            try {
              await selfResolveComplaint(complaint.id, 'Fixed by student on-site');
              await loadData();
            } catch (err) {
              console.error('Self resolve failed:', err);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleWithdraw = () => {
    if (!complaint) return;
    Alert.alert(
      'Withdraw Complaint?',
      'Are you sure you want to withdraw this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await withdrawComplaint(complaint.id, 'Withdrawn by student');
              await loadData();
            } catch (err) {
              console.error('Withdraw failed:', err);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const refCode = getComplaintReference(complaint);
  const isMine = complaint.user_id === user?.id;
  const isSupported = Boolean(complaint.has_user_upvoted);
  const isClosed = complaint.status === 'Resolved' || complaint.status === 'Withdrawn';
  const categoryIcon = CATEGORY_ICONS[complaint.category] || '📌';

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backHeaderBtn}
          activeOpacity={0.7}
        >
          <ArrowLeftIcon size={18} color={COLORS.textPrimary} />
          <Text style={styles.backHeaderText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Complaint detail</Text>

        <TouchableOpacity
          style={styles.commentHeaderBtn}
          onPress={() => setShowCommentsModal(true)}
        >
          <CommentIcon size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Reference & Badge Header */}
        <View style={styles.headerCard}>
          <View style={styles.metaRow}>
            <Text style={styles.refCode}>COMPLAINT {refCode}</Text>
            <View style={styles.badgeGroup}>
              <StatusBadge status={complaint.status} size="small" />
              <PriorityBadge priority={complaint.priority} size="small" />
            </View>
          </View>

          <Text style={styles.title}>{complaint.title}</Text>

          <View style={styles.tagsRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagIcon}>{categoryIcon}</Text>
              <Text style={styles.categoryTagText}>{complaint.category}</Text>
            </View>

            <View style={styles.locationTag}>
              <PinIcon size={12} color={COLORS.textSecondary} />
              <Text style={styles.locationTagText} numberOfLines={1}>
                {complaint.location}
              </Text>
            </View>
          </View>

          <Text style={styles.dateSubmitted}>
            Reported on {formatDateTime(complaint.created_at)}
          </Text>
        </View>

        {/* Photo Banner */}
        {complaint.image_url ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: complaint.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Description Section */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{complaint.description}</Text>
        </View>

        {/* Official Admin Note Card */}
        {complaint.admin_note ? (
          <View style={styles.adminNoteCard}>
            <View style={styles.adminNoteHeader}>
              <ShieldIcon size={16} color="#B45309" />
              <Text style={styles.adminNoteTitle}>ADMIN NOTE</Text>
            </View>
            <Text style={styles.adminNoteBody}>{complaint.admin_note}</Text>
          </View>
        ) : null}

        {/* Progress Timeline Section (Figma screen 2:17741) */}
        <View style={styles.cardSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.sectionTitle}>Progress</Text>
            <Text style={styles.timelineSub}>
              Latest update {formatDate(complaint.updated_at || complaint.created_at)}
            </Text>
          </View>

          <View style={styles.timelineList}>
            {/* Step 1: Submitted */}
            <View style={styles.timelineStep}>
              <View style={[styles.timelineNode, styles.timelineNodeDone]}>
                <CheckIcon size={11} color="#FFFFFF" />
              </View>
              <View style={styles.timelineStepContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepTitle}>Submitted</Text>
                  <Text style={styles.stepTime}>{formatDate(complaint.created_at)}</Text>
                </View>
                <Text style={styles.stepDescription}>
                  Report received and queued for review.
                </Text>
              </View>
            </View>

            {/* Step 2: In Progress */}
            <View style={styles.timelineStep}>
              <View
                style={[
                  styles.timelineNode,
                  complaint.status === 'In Progress' || complaint.status === 'Resolved'
                    ? styles.timelineNodeDone
                    : styles.timelineNodePending,
                ]}
              >
                <Text style={styles.timelineNodeText}>
                  {complaint.status === 'In Progress' || complaint.status === 'Resolved'
                    ? '✓'
                    : '2'}
                </Text>
              </View>
              <View style={styles.timelineStepContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepTitle}>In Progress</Text>
                  {complaint.status !== 'Pending' && (
                    <Text style={styles.stepTime}>
                      {formatDate(complaint.updated_at)}
                    </Text>
                  )}
                </View>
                <Text style={styles.stepDescription}>
                  {complaint.status === 'Pending'
                    ? 'Awaiting team assignment.'
                    : 'Facilities team assigned and reviewing on-site.'}
                </Text>
              </View>
            </View>

            {/* Step 3: Resolved */}
            <View style={[styles.timelineStep, { borderLeftColor: 'transparent' }]}>
              <View
                style={[
                  styles.timelineNode,
                  complaint.status === 'Resolved'
                    ? styles.timelineNodeResolved
                    : styles.timelineNodePending,
                ]}
              >
                <Text style={styles.timelineNodeText}>
                  {complaint.status === 'Resolved' ? '✓' : '3'}
                </Text>
              </View>
              <View style={styles.timelineStepContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepTitle}>Resolved</Text>
                  {complaint.status === 'Resolved' && (
                    <Text style={styles.stepTime}>
                      {formatDate(complaint.updated_at)}
                    </Text>
                  )}
                </View>
                <Text style={styles.stepDescription}>
                  {complaint.status === 'Resolved'
                    ? 'Problem inspected and marked fixed.'
                    : 'Pending final resolution.'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Student Self-Actions (If author and complaint not closed) */}
        {isMine && !isClosed && (
          <View style={styles.selfActionsCard}>
            <Text style={styles.selfActionsTitle}>Reporter Actions</Text>
            <View style={styles.selfActionsRow}>
              <TouchableOpacity
                style={styles.resolveBtn}
                activeOpacity={0.8}
                onPress={handleSelfResolve}
                disabled={actionLoading}
              >
                <Text style={styles.resolveBtnText}>✓ Fixed On-Site</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.withdrawBtn}
                activeOpacity={0.8}
                onPress={handleWithdraw}
                disabled={actionLoading}
              >
                <Text style={styles.withdrawBtnText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Support Bar (Figma Screen 15:5826) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.supportBarBtn,
            isSupported ? styles.supportBarBtnActive : styles.supportBarBtnInactive,
          ]}
          activeOpacity={0.85}
          onPress={handleToggleUpvote}
          disabled={togglingUpvote}
        >
          {isSupported ? (
            <>
              <CheckIcon size={14} color="#FFFFFF" />
              <Text style={styles.supportBarTextActive}>
                You have this problem too ({complaint.upvotes_count || 1})
              </Text>
            </>
          ) : (
            <>
              <UpvoteIcon size={13} color={COLORS.primary} />
              <Text style={styles.supportBarTextInactive}>
                I have this problem too ({complaint.upvotes_count || 0})
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.commentsBarBtn}
          activeOpacity={0.8}
          onPress={() => setShowCommentsModal(true)}
        >
          <CommentIcon size={16} color={COLORS.textPrimary} />
          <Text style={styles.commentsBarText}>Activity / Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Activity & Comments Conversation Modal */}
      <ActivityCommentsModal
        visible={showCommentsModal}
        complaint={complaint}
        onClose={() => setShowCommentsModal(false)}
        onComplaintUpdated={(updated) => setComplaint(updated)}
      />
    </View>
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
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '700',
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  commentHeaderBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 110,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refCode: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 25,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.categoryBg,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryTagIcon: {
    fontSize: 12,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.categoryText,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '65%',
  },
  locationTagText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dateSubmitted: {
    fontSize: 11.5,
    color: COLORS.textMuted,
  },
  imageContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  image: {
    width: '100%',
    height: 220,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  adminNoteCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  adminNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  adminNoteTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  adminNoteBody: {
    fontSize: 13.5,
    color: '#92400E',
    lineHeight: 19,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineSub: {
    fontSize: 11.5,
    color: COLORS.textMuted,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineStep: {
    flexDirection: 'row',
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 16,
    paddingBottom: 22,
    position: 'relative',
  },
  timelineNode: {
    position: 'absolute',
    left: -11,
    top: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNodeDone: {
    backgroundColor: COLORS.primary,
  },
  timelineNodeResolved: {
    backgroundColor: '#10B981',
  },
  timelineNodePending: {
    backgroundColor: '#CBD5E1',
  },
  timelineNodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timelineStepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stepTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  stepDescription: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  selfActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  selfActionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  selfActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  resolveBtn: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resolveBtnText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  withdrawBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  withdrawBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  supportBarBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  supportBarBtnActive: {
    backgroundColor: COLORS.primary,
  },
  supportBarBtnInactive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  supportBarTextActive: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  supportBarTextInactive: {
    color: COLORS.primary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  commentsBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 13,
  },
  commentsBarText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
