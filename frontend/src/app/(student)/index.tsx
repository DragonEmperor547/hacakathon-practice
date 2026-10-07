import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/theme';
import { Complaint } from '@/types';
import { fetchComplaintsWithUpvotes, toggleComplaintUpvote } from '@/lib/api';
import { ComplaintCard } from '@/components/ComplaintCard';
import { CheckIcon, SparklesIcon } from '@/components/Icons';

type TabFilter = 'all' | 'open' | 'trending';

export default function StudentHomeScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [scope, setScope] = useState<'all' | 'my'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set());

  const loadComplaints = useCallback(async () => {
    try {
      const data = await fetchComplaintsWithUpvotes(user?.id);
      setComplaints(data);
    } catch (e) {
      console.error('Error fetching complaints:', e);
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

  const handleUpvote = async (complaint: Complaint) => {
    if (!user) return;
    if (upvotingIds.has(complaint.id)) return;

    setUpvotingIds((prev) => new Set(prev).add(complaint.id));

    // Optimistic UI update
    const currentlyUpvoted = Boolean(complaint.has_user_upvoted);
    const newUpvoted = !currentlyUpvoted;
    const newCount = (complaint.upvotes_count || 0) + (newUpvoted ? 1 : -1);

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaint.id
          ? {
              ...c,
              has_user_upvoted: newUpvoted,
              upvotes_count: Math.max(0, newCount),
            }
          : c
      )
    );

    if (newUpvoted) {
      showToast('You supported this problem');
    }

    try {
      const res = await toggleComplaintUpvote(complaint.id, user.id);
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaint.id
            ? {
                ...c,
                has_user_upvoted: res.upvoted,
                upvotes_count: res.upvotes_count,
              }
            : c
        )
      );
    } catch (e) {
      console.error('Upvote failed, rolling back:', e);
      // Rollback
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaint.id
            ? {
                ...c,
                has_user_upvoted: currentlyUpvoted,
                upvotes_count: complaint.upvotes_count,
              }
            : c
        )
      );
    } finally {
      setUpvotingIds((prev) => {
        const next = new Set(prev);
        next.delete(complaint.id);
        return next;
      });
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2500);
  };

  // Scope filter (All Campus vs My Reports)
  const scopedComplaints = complaints.filter((c) => {
    if (scope === 'my') {
      return c.user_id === user?.id;
    }
    return true;
  });

  // Tab filter
  const displayedComplaints = [...scopedComplaints]
    .filter((c) => {
      if (activeTab === 'open') {
        return c.status === 'Pending' || c.status === 'In Progress';
      }
      return true;
    })
    .sort((a, b) => {
      if (activeTab === 'trending') {
        return (b.upvotes_count || 0) - (a.upvotes_count || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const totalCount = scopedComplaints.length;
  const openCount = scopedComplaints.filter(
    (c) => c.status === 'Pending' || c.status === 'In Progress'
  ).length;

  return (
    <View style={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <View style={styles.toastPill}>
            <CheckIcon size={12} color="#FFFFFF" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* Top App Header */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <SparklesIcon size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandName}>CampusCare</Text>
            <Text style={styles.userRoleText}>
              {profile?.full_name || 'Student Portal'}
            </Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.reportHeaderBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(student)/report')}
          >
            <Text style={styles.reportHeaderBtnText}>+ Report</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Header Title & Scope Switcher */}
      <View style={styles.headerSection}>
        <View style={styles.scopeSwitcher}>
          <TouchableOpacity
            style={[styles.scopeBtn, scope === 'all' && styles.scopeBtnActive]}
            onPress={() => setScope('all')}
          >
            <Text style={[styles.scopeBtnText, scope === 'all' && styles.scopeBtnTextActive]}>
              Campus Feed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeBtn, scope === 'my' && styles.scopeBtnActive]}
            onPress={() => setScope('my')}
          >
            <Text style={[styles.scopeBtnText, scope === 'my' && styles.scopeBtnTextActive]}>
              My Reports
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.headerSubtitle}>
          Follow every report from submission to resolution.
        </Text>

        {/* Filter Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'all' && styles.tabPillActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All
            </Text>
            <View
              style={[styles.tabBadge, activeTab === 'all' && styles.tabBadgeActive]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'all' && styles.tabBadgeTextActive,
                ]}
              >
                {totalCount}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'open' && styles.tabPillActive]}
            onPress={() => setActiveTab('open')}
          >
            <Text style={[styles.tabText, activeTab === 'open' && styles.tabTextActive]}>
              Open
            </Text>
            <View
              style={[styles.tabBadge, activeTab === 'open' && styles.tabBadgeActive]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'open' && styles.tabBadgeTextActive,
                ]}
              >
                {openCount}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'trending' && styles.tabPillActive]}
            onPress={() => setActiveTab('trending')}
          >
            <Text style={[styles.tabText, activeTab === 'trending' && styles.tabTextActive]}>
              Trending 🔥
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={displayedComplaints}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ComplaintCard
              complaint={item}
              onPress={() => router.push(`/(student)/complaint/${item.id}`)}
              onUpvotePress={() => handleUpvote(item)}
              upvoting={upvotingIds.has(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>You’re all caught up</Text>
              <Text style={styles.emptySubtitle}>
                No other complaints to show. Spot something new? Report it in under a
                minute.
              </Text>
              <TouchableOpacity
                style={styles.emptyReportBtn}
                onPress={() => router.push('/(student)/report')}
              >
                <Text style={styles.emptyReportBtnText}>Report a problem</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  userRoleText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reportHeaderBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  reportHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scopeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  scopeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  scopeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  scopeBtnTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabPillActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyReportBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyReportBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
