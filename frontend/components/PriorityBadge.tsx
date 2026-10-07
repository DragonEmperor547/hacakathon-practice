import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { ComplaintPriority } from '../types';

interface PriorityBadgeProps {
  priority: ComplaintPriority;
  size?: 'small' | 'medium' | 'large';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'medium' }) => {
  const config = COLORS.priority[priority] || COLORS.priority.Medium;

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
        return { paddingVertical: 2, paddingHorizontal: 7 };
      case 'large':
        return { paddingVertical: 5, paddingHorizontal: 11 };
      default:
        return { paddingVertical: 3, paddingHorizontal: 9 };
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
      <Text style={[styles.text, { color: config.text, fontSize: getFontSize() }]}>
        {priority}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
