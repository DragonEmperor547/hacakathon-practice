import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { ComplaintStatus } from '../types';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'small' | 'medium' | 'large';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'medium',
  showDot = true,
}) => {
  const config = COLORS.status[status] || COLORS.status.Pending;

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 11;
      case 'large':
        return 13;
      default:
        return 12;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 2, paddingHorizontal: 8 };
      case 'large':
        return { paddingVertical: 5, paddingHorizontal: 12 };
      default:
        return { paddingVertical: 3, paddingHorizontal: 10 };
    }
  };

  return (
    <View
      style={[
        styles.badge,
        getPadding(),
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      {showDot ? (
        <View style={[styles.dot, { backgroundColor: config.dot }]} />
      ) : null}
      <Text style={[styles.text, { color: config.text, fontSize: getFontSize() }]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
