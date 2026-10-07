import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { Complaint } from '../types';
import { getComplaintReference } from '../lib/api';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import {
  CATEGORY_ICONS,
  CheckIcon,
  CommentIcon,
  PinIcon,
  UpvoteIcon,
} from './Icons';

interface ComplaintCardProps {
  complaint: Complaint;
  onPress: () => void;
  onUpvotePress?: () => void;
  showReporter?: boolean;
  upvoting?: boolean;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({
  complaint,
  onPress,
  onUpvotePress,
  showReporter = false,
  upvoting = false,
}) => {
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

  const refCode = getComplaintReference(complaint);
  const categoryIcon = CATEGORY_ICONS[complaint.category] || '📌';
  const isSupported = Boolean(complaint.has_user_upvoted);
  const upvoteCount = complaint.upvotes_count || 0;
  const commentsCount = complaint.comments_count || 0;

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.header}>
        <View style={styles.leftTags}>
          <Text style={styles.refCode}>{refCode}</Text>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryIconText}>{categoryIcon}</Text>
            <Text style={styles.categoryText}>{complaint.category}</Text>
          </View>
        </View>

        <View style={styles.rightTags}>
          <StatusBadge status={complaint.status} size="small" />
          <Text style={styles.dateText}>{formatDate(complaint.created_at)}</Text>
        </View>
      </View>

      {/* Main Content Row */}
      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {complaint.title}
          </Text>

          <View style={styles.locationRow}>
            <PinIcon size={12} color={COLORS.textSecondary} />
            <Text style={styles.location} numberOfLines={1}>
              {complaint.location}
            </Text>
          </View>

          {showReporter && complaint.profiles?.full_name ? (
            <Text style={styles.reporter} numberOfLines={1}>
              👤 {complaint.profiles.full_name}
            </Text>
          ) : null}
        </View>

        {complaint.image_url ? (
          <Image
            source={{ uri: complaint.image_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : null}
      </View>

      {/* Card Footer: Upvote Action & Comments Count */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={(e) => {
            e.stopPropagation();
            if (onUpvotePress) onUpvotePress();
          }}
          disabled={upvoting}
          style={[
            styles.upvoteButton,
            isSupported ? styles.upvoteButtonActive : styles.upvoteButtonInactive,
          ]}
        >
          {isSupported ? (
            <>
              <CheckIcon size={12} color="#FFFFFF" />
              <Text style={styles.upvoteTextActive}>
                Supported <Text style={styles.upvoteCountBold}>{upvoteCount}</Text>
              </Text>
            </>
          ) : (
            <>
              <UpvoteIcon size={11} color={COLORS.primary} />
              <Text style={styles.upvoteTextInactive}>
                Upvote <Text style={styles.upvoteCountBold}>{upvoteCount}</Text>
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footerMeta}>
          {commentsCount > 0 ? (
            <View style={styles.commentsBadge}>
              <CommentIcon size={12} color={COLORS.textSecondary} />
              <Text style={styles.commentsText}>+{commentsCount}</Text>
            </View>
          ) : null}

          <PriorityBadge priority={complaint.priority} size="small" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leftTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refCode: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.categoryBg,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  categoryIconText: {
    fontSize: 11,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.categoryText,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSubtle,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  location: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    flex: 1,
  },
  reporter: {
    fontSize: 11.5,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  upvoteButtonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  upvoteButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  upvoteTextInactive: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  upvoteTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  upvoteCountBold: {
    fontWeight: '800',
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  commentsText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
