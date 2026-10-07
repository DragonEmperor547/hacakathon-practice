import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
}

export const PinIcon: React.FC<IconProps> = ({ size = 14, color = '#64748B' }) => (
  <Text style={{ fontSize: size, color }}>📍</Text>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 14, color = '#FFFFFF' }) => (
  <Text style={{ fontSize: size, color, fontWeight: '900' }}>✓</Text>
);

export const ThumbsUpIcon: React.FC<IconProps> = ({ size = 14, color = '#2563EB' }) => (
  <Text style={{ fontSize: size, color }}>👍</Text>
);

export const UpvoteIcon: React.FC<IconProps> = ({ size = 14, color = '#2563EB' }) => (
  <Text style={{ fontSize: size, color, fontWeight: '800' }}>▲</Text>
);

export const CommentIcon: React.FC<IconProps> = ({ size = 14, color = '#64748B' }) => (
  <Text style={{ fontSize: size, color }}>💬</Text>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 14, color = '#64748B' }) => (
  <Text style={{ fontSize: size, color }}>⏱️</Text>
);

export const ShieldIcon: React.FC<IconProps> = ({ size = 14, color = '#2563EB' }) => (
  <Text style={{ fontSize: size, color }}>🛡️</Text>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 16, color = '#64748B' }) => (
  <Text style={{ fontSize: size, color }}>🔍</Text>
);

export const FilterIcon: React.FC<IconProps> = ({ size = 14, color = '#64748B' }) => (
  <Text style={{ fontSize: size, color }}>⚙️</Text>
);

export const CameraIcon: React.FC<IconProps> = ({ size = 18, color = '#2563EB' }) => (
  <Text style={{ fontSize: size, color }}>📷</Text>
);

export const GalleryIcon: React.FC<IconProps> = ({ size = 18, color = '#2563EB' }) => (
  <Text style={{ fontSize: size, color }}>🖼️</Text>
);

export const ArrowLeftIcon: React.FC<IconProps> = ({ size = 18, color = '#0F172A' }) => (
  <Text style={{ fontSize: size, color, fontWeight: 'bold' }}>←</Text>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 18, color = '#64748B' }) => (
  <Text style={{ fontSize: size, color, fontWeight: 'bold' }}>✕</Text>
);

export const UserIcon: React.FC<IconProps> = ({ size = 14, color = '#64748B' }) => (
  <Text style={{ fontSize: size, color }}>👤</Text>
);

export const FlameIcon: React.FC<IconProps> = ({ size = 14, color = '#EA580C' }) => (
  <Text style={{ fontSize: size, color }}>🔥</Text>
);

export const SparklesIcon: React.FC<IconProps> = ({ size = 16, color = '#2563EB' }) => (
  <Text style={{ fontSize: size, color }}>✨</Text>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 14, color = '#94A3B8' }) => (
  <Text style={{ fontSize: size, color, fontWeight: '700' }}>›</Text>
);

export const CATEGORY_ICONS: Record<string, string> = {
  Lighting: '💡',
  Furniture: '🪑',
  'Water Leakage': '💧',
  Cleanliness: '✨',
  Equipment: '⚙️',
  Network: '📶',
};
