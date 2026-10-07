import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/theme';
import { Category, Complaint, ComplaintPriority, ComplaintStatus } from '@/types';
import { fetchAllComplaints, getComplaintReference } from '@/lib/api';
import { PriorityBadge } from '@/components/PriorityBadge';
import { StatusBadge } from '@/components/StatusBadge';
import {
  CATEGORY_ICONS,
  CommentIcon,
  FilterIcon,
  PinIcon,
  SearchIcon,
  UpvoteIcon,
} from '@/components/Icons';

const CATEGORIES: Category[] = [
  'Lighting',
  'Furniture',
  'Water Leakage',
  'Cleanliness',
  'Equipment',
  'Network',
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ComplaintStatus>('All');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [urgentFirst, setUrgentFirst] = useState(true);

  const loadComplaints = useCallback(async () => {
    try {
      const data = await fetchAllComplaints(user?.id);
      setComplaints(data);
    } catch (e) {
      console.error('Error fetching admin complaints:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadComplaints();
  };

  // Metrics
  const pendingCount = complaints.filter((c) => c.status === 'Pending').length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;

  // Filtered & Sorted list
  const filteredComplaints = complaints
    .filter((c) => {
      // Status filter
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      // Category filter
      if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;
      // Search query (title, location, reporter name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = c.title.toLowerCase().includes(q);
        const locMatch = c.location.toLowerCase().includes(q);
        const reporterMatch = c.profiles?.full_name?.toLowerCase().includes(q) || false;
        const refMatch = getComplaintReference(c).toLowerCase().includes(q);
        return titleMatch || locMatch || reporterMatch || refMatch;
      }
      return true;
    })
    .sort((a, b) => {
      if (urgentFirst) {
        const priorityOrder: Record<ComplaintPriority, number> = {
          Urgent: 4,
          High: 3,
          Medium: 2,
          Low: 1,
        };
        const pA = priorityOrder[a.priority] || 0;
        const pB = priorityOrder[b.priority] || 0;
        if (pA !== pB) return pB - pA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* Top Admin Header */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.adminTag}>
            <Text style={styles.adminTagText}>ADMIN</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>Admin dashboard</Text>
            <Text style={styles.adminSubtitle}>{profile?.full_name || 'Coordinator'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredComplaints}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.introHeading}>
              Triage incoming complaints, prioritize urgent work, and keep students updated.
            </Text>

            {/* Overview Stat Metrics Cards */}
            <View style={styles.statsRow}>
              <TouchableOpacity
                style={[
                  styles.statCard,
                  statusFilter === 'Pending' && styles.statCardActive,
                ]}
                onPress={() =>
                  setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')
                }
              >
                <Text style={[styles.statNumber, { color: '#D97706' }]}>
                  {pendingCount}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statCard,
                  statusFilter === 'In Progress' && styles.statCardActive,
                ]}
                onPress={() =>
                  setStatusFilter(statusFilter === 'In Progress' ? 'All' : 'In Progress')
                }
              >
                <Text style={[styles.statNumber, { color: COLORS.primary }]}>
                  {inProgressCount}
                </Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statCard,
                  statusFilter === 'Resolved' && styles.statCardActive,
                ]}
                onPress={() =>
                  setStatusFilter(statusFilter === 'Resolved' ? 'All' : 'Resolved')
                }
              >
                <Text style={[styles.statNumber, { color: '#059669' }]}>
                  {resolvedCount}
                </Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBox}>
              <SearchIcon size={16} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search title, location or reporter"
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Status Filter Chips */}
            <View style={styles.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(['All', 'Pending', 'In Progress', 'Resolved'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.filterChip,
                      statusFilter === st && styles.filterChipActive,
                    ]}
                    onPress={() => setStatusFilter(st)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === st && styles.filterChipTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Category Filter Chips */}
            <View style={styles.categorySection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    selectedCategory === 'All' && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory('All')}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === 'All' && styles.categoryChipTextActive,
                    ]}
                  >
                    All Categories
                  </Text>
                </TouchableOpacity>

                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat && styles.categoryChipActive,
                    ]}
                    onPress={() =>
                      setSelectedCategory(selectedCategory === cat ? 'All' : cat)
                    }
                  >
                    <Text style={styles.catEmoji}>{CATEGORY_ICONS[cat]}</Text>
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Queue Counter & Urgent Toggle */}
            <View style={styles.queueMetaRow}>
              <Text style={styles.queueCounterText}>
                {filteredComplaints.length} complaints
              </Text>

              <TouchableOpacity
                style={[
                  styles.urgentToggleBtn,
                  urgentFirst && styles.urgentToggleBtnActive,
                ]}
                onPress={() => setUrgentFirst(!urgentFirst)}
              >
                <Text
                  style={[
                    styles.urgentToggleText,
                    urgentFirst && styles.urgentToggleTextActive,
                  ]}
                >
                  ⚡ Urgent first
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const refCode = getComplaintReference(item);
          const reporterName = item.profiles?.full_name || 'Student Reporter';

          return (
            <TouchableOpacity
              style={styles.queueCard}
              activeOpacity={0.75}
              onPress={() => router.push(`/(admin)/complaint/${item.id}`)}
            >
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <PriorityBadge priority={item.priority} size="small" />
                  <StatusBadge status={item.status} size="small" />
                  <Text style={styles.cardRef}>{refCode}</Text>
                </View>
                <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
              </View>

              {/* Title & Details */}
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>

              <View style={styles.metaLocationRow}>
                <Text style={styles.cardCategory}>
                  {CATEGORY_ICONS[item.category]} {item.category}
                </Text>
                <Text style={styles.metaDivider}>·</Text>
                <PinIcon size={12} color={COLORS.textSecondary} />
                <Text style={styles.cardLocation} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>

              {/* Reporter Info & Upvote/Comment counters */}
              <View style={styles.cardFooter}>
                <View style={styles.reporterInfo}>
                  <View style={styles.reporterAvatar}>
                    <Text style={styles.reporterAvatarText}>
                      {getInitials(reporterName)}
                    </Text>
                  </View>
                  <Text style={styles.reporterNameText} numberOfLines={1}>
                    {reporterName}
                  </Text>
                </View>

                <View style={styles.statsBadges}>
                  <View style={styles.miniStatBadge}>
                    <UpvoteIcon size={11} color={COLORS.primary} />
                    <Text style={styles.miniStatText}>{item.upvotes_count || 0}</Text>
                  </View>
                  <View style={styles.miniStatBadge}>
                    <CommentIcon size={11} color={COLORS.textSecondary} />
                    <Text style={styles.miniStatText}>{item.comments_count || 0}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No complaints match filters</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search criteria or resetting filters.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminTag: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  adminSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  signOutText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  headerContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  introHeading: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.textPrimary,
  },
  filterSection: {
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categorySection: {
    marginBottom: 14,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  catEmoji: {
    fontSize: 11,
  },
  categoryChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  queueMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 4,
  },
  queueCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  urgentToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  urgentToggleBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  urgentToggleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  urgentToggleTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  queueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardRef: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 6,
  },
  metaLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.categoryText,
  },
  metaDivider: {
    color: COLORS.textMuted,
  },
  cardLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reporterAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reporterAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  reporterNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statsBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniStatText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
