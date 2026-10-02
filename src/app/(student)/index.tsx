import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { fetchStudentComplaints } from '@/lib/api';
import { Complaint, ComplaintStatus } from '@/types';
import { ComplaintCard } from '@/components/ComplaintCard';
import { Chips } from '@/components/Chips';
import { Button } from '@/components/Button';
import { COLORS, LAYOUT } from '@/constants/theme';

const STATUS_FILTERS: (ComplaintStatus | 'All')[] = [
  'All',
  'Pending',
  'In Progress',
  'Resolved',
  'Rejected',
];

export default function StudentHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | 'All'>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadComplaints = useCallback(async () => {
    if (!user?.id) return;
    try {
      setErrorMsg(null);
      const data = await fetchStudentComplaints(user.id);
      setComplaints(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const onRefresh = () => {
    setRefreshing(true);
    loadComplaints();
  };

  const filteredComplaints = complaints.filter((c) => {
    if (selectedStatus === 'All') return true;
    return c.status === selectedStatus;
  });

  return (
    <View style={styles.container}>
      <View style={styles.centeredWrapper}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>My Complaints</Text>
            <Text style={styles.subtitle}>Track and manage your reported campus issues</Text>
          </View>
          <Button
            title="+ Report Issue"
            onPress={() => router.push('/(student)/report')}
            style={styles.reportBtn}
          />
        </View>

        <View style={styles.filterSection}>
          <Chips
            options={STATUS_FILTERS}
            selectedValue={selectedStatus}
            onSelect={(val: string) => setSelectedStatus(val as ComplaintStatus | 'All')}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading issues...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Error</Text>
            <Text style={styles.emptySubtitle}>{errorMsg}</Text>
            <Button title="Retry" onPress={loadComplaints} style={{ marginTop: 12 }} />
          </View>
        ) : filteredComplaints.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Complaints Found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedStatus === 'All'
                ? "You haven't reported any campus problems yet."
                : `No complaints with status "${selectedStatus}".`}
            </Text>
            <Button
              title="Report a Problem"
              onPress={() => router.push('/(student)/report')}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          <FlatList
            data={filteredComplaints}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ComplaintCard
                complaint={item}
                onPress={() => router.push(`/(student)/complaint/${item.id}`)}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  centeredWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.maxWidth,
    paddingHorizontal: LAYOUT.paddingHorizontal,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reportBtn: {
    minWidth: 140,
  },
  filterSection: {
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyState: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: LAYOUT.cardRadius,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
});
