import { ComplaintPriority, ComplaintStatus } from '../types';

export const COLORS = {
  // Brand
  primary: '#2563EB',        // Figma primary button & brand
  primaryHover: '#1D4ED8',
  primaryLight: '#EFF6FF',   // Figma tinted backgrounds
  primaryBorder: '#BFDBFE',

  accent: '#4F46E5',

  // Surfaces & Backgrounds
  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceHighlight: '#F8FAFC',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  inputBg: '#FFFFFF',
  inputBorder: '#E2E8F0',
  inputFocusBorder: '#2563EB',

  white: '#FFFFFF',
  shadow: '#0F172A',

  // Status Badges (Figma palette)
  status: {
    Pending: {
      bg: '#FEF3C7',
      text: '#D97706',
      border: '#FDE68A',
      dot: '#F59E0B',
    },
    'In Progress': {
      bg: '#EFF6FF',
      text: '#2563EB',
      border: '#BFDBFE',
      dot: '#3B82F6',
    },
    Resolved: {
      bg: '#ECFDF5',
      text: '#059669',
      border: '#A7F3D0',
      dot: '#10B981',
    },
    Rejected: {
      bg: '#FEF2F2',
      text: '#DC2626',
      border: '#FECACA',
      dot: '#EF4444',
    },
    Withdrawn: {
      bg: '#F1F5F9',
      text: '#64748B',
      border: '#CBD5E1',
      dot: '#94A3B8',
    },
  } as Record<ComplaintStatus, { bg: string; text: string; border: string; dot: string }>,

  // Priority Badges (Figma palette)
  priority: {
    Low: { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
    Medium: { bg: '#F0F9FF', text: '#0284C7', border: '#BAE6FD' },
    High: { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
    Urgent: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  } as Record<ComplaintPriority, { bg: string; text: string; border: string }>,

  categoryBg: '#F1F5F9',
  categoryText: '#334155',
  categoryBorder: '#E2E8F0',

  // Interactive buttons
  upvoteUnselectedBg: '#FFFFFF',
  upvoteUnselectedBorder: '#CBD5E1',
  upvoteUnselectedText: '#334155',

  upvoteSelectedBg: '#2563EB',
  upvoteSelectedBorder: '#2563EB',
  upvoteSelectedText: '#FFFFFF',
};

export const LAYOUT = {
  maxWidth: 900,
  paddingHorizontal: 18,
  borderRadius: 12,
  cardRadius: 14,
  badgeRadius: 20,
};
