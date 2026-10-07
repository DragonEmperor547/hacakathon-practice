import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ScrollView,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { Complaint } from '../types';
import { StatusBadge } from './StatusBadge';
import { getComplaintReference } from '../lib/api';
import { ThumbsUpIcon, CloseIcon } from './Icons';

interface SimilarIssuesSheetProps {
  visible: boolean;
  issues: Complaint[];
  onClose: () => void;
  onUpvoteExisting: (issue: Complaint) => void;
  onContinueFiling: () => void;
}

export const SimilarIssuesSheet: React.FC<SimilarIssuesSheetProps> = ({
  visible,
  issues,
  onClose,
  onUpvoteExisting,
  onContinueFiling,
}) => {
  if (!visible || issues.length === 0) return null;

  const topIssue = issues[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetContainer}>
              <View style={styles.handleBar} />

              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.sheetTitle}>Similar issues nearby</Text>
                  <Text style={styles.sheetSubtitle}>
                    Is this the same problem? Add your support so the team knows who’s affected.
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <CloseIcon size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.issuesList} showsVerticalScrollIndicator={false}>
                {issues.map((issue) => (
                  <View key={issue.id} style={styles.issueCard}>
                    <View style={styles.cardTop}>
                      <Text style={styles.refCode}>{getComplaintReference(issue)}</Text>
                      <StatusBadge status={issue.status} size="small" />
                    </View>

                    <Text style={styles.issueTitle}>{issue.title}</Text>
                    <Text style={styles.issueLocation}>📍 {issue.location}</Text>

                    <View style={styles.affectedRow}>
                      <ThumbsUpIcon size={13} color={COLORS.primary} />
                      <Text style={styles.affectedText}>
                        {issue.upvotes_count || 1} students affected
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.upvoteBtn}
                  activeOpacity={0.8}
                  onPress={() => onUpvoteExisting(topIssue)}
                >
                  <Text style={styles.upvoteBtnText}>Same problem - Upvote</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.continueBtn}
                  activeOpacity={0.7}
                  onPress={onContinueFiling}
                >
                  <Text style={styles.continueBtnText}>Different issue - Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    maxWidth: 290,
  },
  closeBtn: {
    padding: 6,
  },
  issuesList: {
    maxHeight: 280,
    marginBottom: 16,
  },
  issueCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  refCode: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.primary,
  },
  issueTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  issueLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  affectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  affectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionsContainer: {
    gap: 10,
    paddingTop: 8,
  },
  upvoteBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upvoteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  continueBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
