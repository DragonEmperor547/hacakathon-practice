import React from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/theme';

export default function IndexScreen() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Campus Complaints...</Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile?.role === 'admin') {
    return <Redirect href="/(admin)" />;
  }

  return <Redirect href="/(student)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
