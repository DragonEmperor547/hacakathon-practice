import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface InlineMessageProps {
  type?: 'error' | 'success' | 'info';
  message: string | null;
}

export const InlineMessage: React.FC<InlineMessageProps> = ({
  type = 'error',
  message,
}) => {
  if (!message) return null;

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' };
      case 'info':
        return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
      default:
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});
