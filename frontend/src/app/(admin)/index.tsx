import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchAllComplaints } from '@/lib/api';
import { Category, Complaint, ComplaintPriority, ComplaintStatus } from '@/types';
import { ComplaintCard } from '@/components/ComplaintCard';
import { Chips } from '@/components/Chips';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { COLORS, LAYOUT } from '@/constants/theme';

const STATUS_OPTIONS: (ComplaintStatus | 'All')[] = [
  'All',
  'Pending',
  'In Progress',
  'Resolved',
  'Rejected',
];

const CATEGORY_OPTIONS: (Category | 'All')[] = [
  'All',
  'Lighting',
  'Furniture',
  'Water Leakage',
  'Cleanliness',
  'Equipment',
  'Network',
];

const PRIORITY_OPTIONS: (ComplaintPriority | 'All')[] = [
  'All',
  'Urgent',
  'High',
  'Medium',
  'Low',
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority | 'All'>('All');
  const [sortUrgentFirst, setSortUrgentFirst] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      setErrorMsg(null);
      const data = await fetchAllComplaints();
      setComplaints(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch complaints');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Metrics
  const pendingCount = complaints.filter((c) => c.status === 'Pending').length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;
  const urgentCount = complaints.filter((c) => c.priority === 'Urgent' && c.status !== 'Resolved').length;

  // Priority ranking weight for sorting
  const priorityWeight: Record<ComplaintPriority, number> = {
    Urgent: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };

  // Filter & Sort logic
  const filtered = complaints
    .filter((item) => {
      if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (selectedPriority !== 'All' && item.priority !== selectedPriority) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesLocation = item.location.toLowerCase().includes(q);
        const matchesDescription = item.description.toLowerCase().includes(q);
        const matchesReporter = item.profiles?.full_name?.toLowerCase().includes(q) ?? false;
        return matchesTitle || matchesLocation || matchesDescription || matchesReporter;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortUrgentFirst) {
        const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (weightDiff !== 0) return weightDiff;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <View style={styles.container}>
      <View style={styles.centeredWrapper}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Complaints Dashboard</Text>
          <Text style={styles.subtitle}>Review, prioritize, and update campus issues</Text>
        </View>

        {/* METRICS SUMMARY CARDS */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { borderColor: '#CBD5E1' }]}>
            <Text style={styles.metricNumber}>{pendingCount}</Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: '#FCD34D', backgroundColor: '#FEF9C3' }]}>
            <Text style={[styles.metricNumber, { color: '#D97706' }]}>{inProgressCount}</Text>
            <Text style={[styles.metricLabel, { color: '#B45309' }]}>In Progress</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: '#6EE7B7', backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.metricNumber, { color: '#059669' }]}>{resolvedCount}</Text>
            <Text style={[styles.metricLabel, { color: '#047857' }]}>Resolved</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: '#FDA4AF', backgroundColor: '#FFE4E6' }]}>
            <Text style={[styles.metricNumber, { color: '#E11D48' }]}>{urgentCount}</Text>
            <Text style={[styles.metricLabel, { color: '#BE123C' }]}>Active Urgent</Text>
          </View>
        </View>

        {/* SEARCH & FILTERS */}
        <View style={styles.controlsSection}>
          <Input
            placeholder="🔍 Search title, location, reporter..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Status:</Text>
            <Chips
              options={STATUS_OPTIONS}
              selectedValue={selectedStatus}
              onSelect={(val: string) => setSelectedStatus(val as ComplaintStatus | 'All')}
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Category:</Text>
            <Chips
              options={CATEGORY_OPTIONS}
              selectedValue={selectedCategory}
              onSelect={(val: string) => setSelectedCategory(val as Category | 'All')}
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Priority:</Text>
            <Chips
              options={PRIORITY_OPTIONS}
              selectedValue={selectedPriority}
              onSelect={(val: string) => setSelectedPriority(val as ComplaintPriority | 'All')}
            />
          </View>

          <View style={styles.sortBar}>
            <TouchableOpacity
              style={[styles.sortToggle, sortUrgentFirst && styles.sortToggleActive]}
              onPress={() => setSortUrgentFirst(!sortUrgentFirst)}
            >
              <Text style={[styles.sortToggleText, sortUrgentFirst && styles.sortToggleTextActive]}>
                ⚡ {sortUrgentFirst ? 'Sorted by Urgent First' : 'Sort by Urgent First'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.countInfo}>
              Showing {filtered.length} of {complaints.length}
            </Text>
          </View>
        </View>

        {/* COMPLAINTS LIST */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Fetching complaints database...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Error loading data</Text>
            <Text style={styles.emptySubtitle}>{errorMsg}</Text>
            <Button title="Retry" onPress={loadAllData} style={{ marginTop: 12 }} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No Matching Complaints</Text>
            <Text style={styles.emptySubtitle}>Try resetting search filters or status tags.</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ComplaintCard
                complaint={item}
                showReporter={true}
                onPress={() => router.push(`/(admin)/complaint/${item.id}`)}
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
  header: {
    marginBottom: 16,
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
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  controlsSection: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterRow: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 10,
  },
  sortToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortToggleActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  sortToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sortToggleTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  countInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 40,
  },
  centerContainer: {
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
  },
});
