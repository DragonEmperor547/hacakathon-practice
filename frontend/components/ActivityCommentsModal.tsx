import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { Complaint, ComplaintComment, StatusHistory } from '../types';
import {
  fetchComplaintComments,
  fetchStatusHistory,
  getComplaintReference,
  postComplaintComment,
  subscribeToComplaintComments,
  toggleComplaintUpvote,
} from '../lib/api';
import { useAuth } from '../src/context/AuthContext';
import { CheckIcon, CloseIcon, ShieldIcon, UpvoteIcon } from './Icons';

interface ActivityCommentsModalProps {
  visible: boolean;
  complaint: Complaint;
  onClose: () => void;
  onComplaintUpdated?: (updated: Complaint) => void;
}

export const ActivityCommentsModal: React.FC<ActivityCommentsModalProps> = ({
  visible,
  complaint,
  onClose,
  onComplaintUpdated,
}) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<ComplaintComment[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentComplaint, setCurrentComplaint] = useState(complaint);
  const [togglingUpvote, setTogglingUpvote] = useState(false);

  useEffect(() => {
    setCurrentComplaint(complaint);
  }, [complaint]);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    setLoading(true);

    Promise.all([
      fetchComplaintComments(complaint.id),
      fetchStatusHistory(complaint.id),
    ]).then(([commList, histList]) => {
      if (isMounted) {
        setComments(commList);
        setHistory(histList);
        setLoading(false);
      }
    });

    const channel = subscribeToComplaintComments(complaint.id, (newComment) => {
      if (isMounted) {
        setComments((prev) => {
          if (prev.some((c) => c.id === newComment.id)) return prev;
          return [...prev, newComment];
        });
      }
    });

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [visible, complaint.id]);

  const handleSend = async () => {
    if (!inputText.trim() || !user || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const isAdmin = profile?.role === 'admin';
      const newComment = await postComplaintComment(
        complaint.id,
        user.id,
        textToSend,
        isAdmin
      );
      setComments((prev) => {
        if (prev.some((c) => c.id === newComment.id)) return prev;
        return [...prev, newComment];
      });
    } catch (e) {
      console.error('Failed to post comment:', e);
    } finally {
      setSending(false);
    }
  };

  const handleToggleSupport = async () => {
    if (!user || togglingUpvote) return;
    setTogglingUpvote(true);

    try {
      const result = await toggleComplaintUpvote(currentComplaint.id, user.id);
      const updated = {
        ...currentComplaint,
        has_user_upvoted: result.upvoted,
        upvotes_count: result.upvotes_count,
      };
      setCurrentComplaint(updated);
      if (onComplaintUpdated) onComplaintUpdated(updated);
    } catch (e) {
      console.error('Failed to toggle upvote:', e);
    } finally {
      setTogglingUpvote(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }) + ' · ' + d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Build unified chronological timeline
  type TimelineItem =
    | { type: 'history'; data: StatusHistory; timestamp: string }
    | { type: 'comment'; data: ComplaintComment; timestamp: string };

  const timelineItems: TimelineItem[] = [
    ...history.map((h) => ({
      type: 'history' as const,
      data: h,
      timestamp: h.changed_at,
    })),
    ...comments.map((c) => ({
      type: 'comment' as const,
      data: c,
      timestamp: c.created_at,
    })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const refCode = getComplaintReference(currentComplaint);
  const isSupported = Boolean(currentComplaint.has_user_upvoted);
  const upvoteCount = currentComplaint.upvotes_count || 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <CloseIcon size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Activity / Comments</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Complaint Context Header */}
        <View style={styles.contextHeader}>
          <View style={styles.contextMeta}>
            <Text style={styles.contextRef}>{refCode}</Text>
            <Text style={styles.contextStatus}>
              {currentComplaint.status} · {currentComplaint.priority} priority
            </Text>
          </View>
          <Text style={styles.contextTitle} numberOfLines={1}>
            {currentComplaint.title}
          </Text>

          {/* Support Bar Button */}
          <TouchableOpacity
            style={[
              styles.supportBtn,
              isSupported ? styles.supportBtnActive : styles.supportBtnInactive,
            ]}
            activeOpacity={0.8}
            onPress={handleToggleSupport}
            disabled={togglingUpvote}
          >
            {isSupported ? (
              <>
                <CheckIcon size={14} color="#FFFFFF" />
                <Text style={styles.supportTextActive}>
                  You have this problem too
                </Text>
                <View style={styles.supportBadgeActive}>
                  <Text style={styles.supportBadgeTextActive}>{upvoteCount}</Text>
                </View>
              </>
            ) : (
              <>
                <UpvoteIcon size={13} color={COLORS.primary} />
                <Text style={styles.supportTextInactive}>
                  I have this problem too
                </Text>
                <View style={styles.supportBadgeInactive}>
                  <Text style={styles.supportBadgeTextInactive}>{upvoteCount}</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Unified Scrollable Conversation */}
        <ScrollView style={styles.conversationArea} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
          ) : timelineItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No activity or comments yet.</Text>
              <Text style={styles.emptySubtext}>
                Ask a question or send an update below.
              </Text>
            </View>
          ) : (
            timelineItems.map((item, index) => {
              if (item.type === 'history') {
                const hist = item.data;
                const isResolved = hist.status === 'Resolved';
                return (
                  <View key={`hist-${hist.id || index}`} style={styles.statusEventRow}>
                    <View
                      style={[
                        styles.eventMarker,
                        isResolved && { backgroundColor: '#ECFDF5' },
                      ]}
                    >
                      <Text style={styles.eventMarkerIcon}>
                        {isResolved ? '✓' : '⚙️'}
                      </Text>
                    </View>
                    <View style={styles.eventBody}>
                      <View style={styles.eventHeader}>
                        <Text style={styles.eventStatus}>{hist.status}</Text>
                        <Text style={styles.eventTime}>{formatTime(hist.changed_at)}</Text>
                      </View>
                      <Text style={styles.eventNote}>
                        {hist.note || `Status updated to ${hist.status}.`}
                      </Text>
                    </View>
                  </View>
                );
              }

              // Comment Item
              const comm = item.data;
              const isMine = comm.user_id === user?.id;
              const isOfficialAdmin = comm.is_official || comm.profiles?.role === 'admin';

              return (
                <View
                  key={`comm-${comm.id || index}`}
                  style={[
                    styles.messageRow,
                    isMine ? styles.myMessageRow : styles.otherMessageRow,
                  ]}
                >
                  {isOfficialAdmin ? (
                    <View style={styles.adminAvatar}>
                      <ShieldIcon size={14} color={COLORS.primary} />
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.messageBubble,
                      isMine
                        ? styles.myBubble
                        : isOfficialAdmin
                        ? styles.adminBubble
                        : styles.otherBubble,
                    ]}
                  >
                    <View style={styles.bubbleHeader}>
                      <Text
                        style={[
                          styles.senderName,
                          isOfficialAdmin && styles.adminSenderText,
                        ]}
                      >
                        {isOfficialAdmin
                          ? 'Admin'
                          : isMine
                          ? 'You'
                          : comm.profiles?.full_name || 'Student'}
                      </Text>
                      <Text style={styles.bubbleTime}>{formatTime(comm.created_at)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.bubbleMessage,
                        isMine && styles.myBubbleText,
                      ]}
                    >
                      {comm.message}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Sticky Message Composer */}
        <View style={styles.composerBar}>
          <TextInput
            style={styles.composerInput}
            placeholder="Write a message…"
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconButton: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  contextHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  contextMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  contextRef: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  contextStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  supportBtnActive: {
    backgroundColor: COLORS.primary,
  },
  supportBtnInactive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  supportTextActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  supportTextInactive: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  supportBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  supportBadgeInactive: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  supportBadgeTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  supportBadgeTextInactive: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  conversationArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusEventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  eventMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMarkerIcon: {
    fontSize: 12,
  },
  eventBody: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  eventStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  eventNote: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    gap: 8,
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  adminAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  adminBubble: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderBottomLeftRadius: 4,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 3,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  adminSenderText: {
    color: COLORS.primary,
  },
  bubbleTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  bubbleMessage: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  myBubbleText: {
    color: '#FFFFFF',
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
