import { ComplaintPriority, ComplaintStatus } from '../types';

export const COLORS = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryLight: '#EFF6FF',

  accent: '#4F46E5',

  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  inputBg: '#F1F5F9',
  white: '#FFFFFF',
  shadow: '#000000',

  status: {
    Pending: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
    'In Progress': { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
    Resolved: { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' },
    Rejected: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
  } as Record<ComplaintStatus, { bg: string; text: string; border: string }>,

  priority: {
    Low: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
    Medium: { bg: '#E0F2FE', text: '#0284C7', border: '#7DD3FC' },
    High: { bg: '#FFEDD5', text: '#EA580C', border: '#FDBA74' },
    Urgent: { bg: '#FFE4E6', text: '#E11D48', border: '#FDA4AF' },
  } as Record<ComplaintPriority, { bg: string; text: string; border: string }>,

  categoryBg: '#F1F5F9',
  categoryText: '#334155',
};

export const LAYOUT = {
  maxWidth: 900,
  paddingHorizontal: 20,
  borderRadius: 12,
  cardRadius: 16,
};
