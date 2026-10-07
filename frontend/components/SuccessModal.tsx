import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { CheckIcon } from './Icons';

interface SuccessModalProps {
  visible: boolean;
  referenceCode: string;
  onViewComplaint: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  referenceCode,
  onViewComplaint,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <CheckIcon size={24} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>Report submitted</Text>
          <Text style={styles.subtitle}>
            Your report <Text style={styles.boldRef}>{referenceCode}</Text> is now{' '}
            <Text style={styles.boldPending}>Pending</Text>. We’ll notify you when it
            moves forward.
          </Text>

          <TouchableOpacity
            style={styles.viewButton}
            activeOpacity={0.8}
            onPress={onViewComplaint}
          >
            <Text style={styles.viewButtonText}>View complaint</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  boldRef: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  boldPending: {
    fontWeight: '700',
    color: '#D97706',
  },
  viewButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
