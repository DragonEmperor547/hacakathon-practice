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
import { fetchComplaintById, fetchStatusHistory } from '@/lib/api';
import { Complaint, StatusHistory } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { COLORS, LAYOUT } from '@/constants/theme';

export default function StudentComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function loadData() {
      setLoading(true);
      const [compData, histData] = await Promise.all([
        fetchComplaintById(id as string),
        fetchStatusHistory(id as string),
      ]);
      setComplaint(compData);
      setHistory(histData);
      setLoading(false);
    }
    loadData();
  }, [id]);

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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to My Complaints</Text>
        </TouchableOpacity>

        <View style={styles.badgeRow}>
          <StatusBadge status={complaint.status} size="large" />
          <PriorityBadge priority={complaint.priority} size="medium" />
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{complaint.category}</Text>
          </View>
        </View>

        <Text style={styles.title}>{complaint.title}</Text>
        <Text style={styles.dateText}>Reported on {formatDate(complaint.created_at)}</Text>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Location</Text>
          <Text style={styles.sectionBody}>{complaint.location}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Description</Text>
          <Text style={styles.sectionBody}>{complaint.description}</Text>
        </View>

        {complaint.admin_note ? (
          <View style={styles.adminNoteBox}>
            <Text style={styles.adminNoteTitle}>📌 Admin Note</Text>
            <Text style={styles.adminNoteBody}>{complaint.admin_note}</Text>
          </View>
        ) : null}

        {complaint.image_url ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📷 Attached Photo</Text>
            <Image source={{ uri: complaint.image_url }} style={styles.image} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* STATUS TIMELINE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏳ Resolution Timeline</Text>

          <View style={styles.timelineContainer}>
            {history.length === 0 ? (
              <Text style={styles.noHistoryText}>No timeline history available.</Text>
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
    marginBottom: 6,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
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
  adminNoteBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  adminNoteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  adminNoteBody: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  image: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
    marginTop: 6,
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
