import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { COLORS } from '../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  ...props
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#CBD5E1';
    switch (variant) {
      case 'secondary':
        return COLORS.primaryLight;
      case 'outline':
        return 'transparent';
      case 'danger':
        return '#EF4444';
      default:
        return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#94A3B8';
    switch (variant) {
      case 'secondary':
        return COLORS.primary;
      case 'outline':
        return COLORS.primary;
      case 'danger':
        return COLORS.white;
      default:
        return COLORS.white;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && { borderWidth: 1, borderColor: COLORS.primary },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 6,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
