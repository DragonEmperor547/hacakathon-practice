import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/theme';
import { InlineMessage } from '@/components/InlineMessage';
import { CheckIcon, SparklesIcon } from '@/components/Icons';

export default function LoginScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuth = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (isSignUp && !agreeTerms) {
      setErrorMsg('Please accept the Terms of Use and Campus Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || 'Student User',
            },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }

      router.replace('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (type: 'student' | 'admin') => {
    setIsSignUp(false);
    setErrorMsg(null);
    if (type === 'student') {
      setEmail('student@example.com');
      setPassword('Demo1234!');
    } else {
      setEmail('admin@example.com');
      setPassword('Demo1234!');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <SparklesIcon size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>CampusCare</Text>
          <Text style={styles.brandTagline}>Report it. Track it. See it fixed.</Text>
          <Text style={styles.brandSubtitle}>
            Join your campus community and help make every space better.
          </Text>
        </View>

        {/* Access Card */}
        <View style={styles.card}>
          {/* Segmented Tab Switch */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, !isSignUp && styles.segmentBtnActive]}
              onPress={() => {
                setIsSignUp(false);
                setErrorMsg(null);
              }}
            >
              <Text style={[styles.segmentText, !isSignUp && styles.segmentTextActive]}>
                Log in
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, isSignUp && styles.segmentBtnActive]}
              onPress={() => {
                setIsSignUp(true);
                setErrorMsg(null);
              }}
            >
              <Text style={[styles.segmentText, isSignUp && styles.segmentTextActive]}>
                Sign up
              </Text>
            </TouchableOpacity>
          </View>

          {errorMsg && (
            <View style={{ marginBottom: 14 }}>
              <InlineMessage type="error" message={errorMsg} />
            </View>
          )}

          {/* Form Fields */}
          {isSignUp && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Maya Chen"
                placeholderTextColor={COLORS.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@university.edu"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {isSignUp && (
            <TouchableOpacity
              style={styles.termsRow}
              activeOpacity={0.7}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                {agreeTerms && <CheckIcon size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the Terms of Use and Campus Privacy Policy.
              </Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isSignUp ? 'Create account' : 'Log in'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Demo Quick-Login Shortcuts */}
          {!isSignUp && (
            <View style={styles.demoSection}>
              <Text style={styles.demoSectionTitle}>PRE-CONFIGURED DEMO ACCOUNTS</Text>
              <View style={styles.demoButtonsRow}>
                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => handleFillDemo('student')}
                >
                  <Text style={styles.demoBtnRole}>Student Demo</Text>
                  <Text style={styles.demoBtnEmail}>student@example.com</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => handleFillDemo('admin')}
                >
                  <Text style={styles.demoBtnRole}>Admin Demo</Text>
                  <Text style={styles.demoBtnEmail}>admin@example.com</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Support Help Footer */}
        <Text style={styles.supportFooter}>
          Need help? <Text style={styles.supportLink}>Contact campus support</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  demoSection: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  demoSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  demoBtnRole: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  demoBtnEmail: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  supportFooter: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 24,
    textAlign: 'center',
  },
  supportLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
