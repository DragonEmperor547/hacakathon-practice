import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { Complaint } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

interface ComplaintCardProps {
  complaint: Complaint;
  onPress: () => void;
  showReporter?: boolean;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({
  complaint,
  onPress,
  showReporter = false,
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

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <StatusBadge status={complaint.status} size="small" />
          <PriorityBadge priority={complaint.priority} size="small" />
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{complaint.category}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{formatDate(complaint.created_at)}</Text>
      </View>

      <View style={styles.contentRow}>
        {complaint.image_url ? (
          <Image source={{ uri: complaint.image_url }} style={styles.thumbnail} />
        ) : null}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {complaint.title}
          </Text>
          <Text style={styles.location} numberOfLines={1}>
            📍 {complaint.location}
          </Text>
          {showReporter && complaint.profiles?.full_name ? (
            <Text style={styles.reporter} numberOfLines={1}>
              👤 {complaint.profiles.full_name}
            </Text>
          ) : null}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryTag: {
    backgroundColor: COLORS.categoryBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.categoryText,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  reporter: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: '500',
  },
});
