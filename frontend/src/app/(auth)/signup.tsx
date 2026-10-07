import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { InlineMessage } from '@/components/InlineMessage';
import { COLORS, LAYOUT } from '@/constants/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else if (data.session) {
      router.replace('/');
    } else {
      setSuccessMsg('Account created successfully! You can now log in.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.appBadge}>📝 Registration</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join as a student to report campus issues</Text>
        </View>

        {errorMsg ? <InlineMessage type="error" message={errorMsg} /> : null}
        {successMsg ? <InlineMessage type="success" message={successMsg} /> : null}

        <Input
          label="Full Name"
          placeholder="e.g. Alex Morgan"
          value={fullName}
          onChangeText={(text: string) => {
            setFullName(text);
            setErrorMsg(null);
          }}
        />

        <Input
          label="Email Address"
          placeholder="student@university.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(text: string) => {
            setEmail(text);
            setErrorMsg(null);
          }}
        />

        <Input
          label="Password"
          placeholder="At least 6 characters"
          secureTextEntry
          value={password}
          onChangeText={(text: string) => {
            setPassword(text);
            setErrorMsg(null);
          }}
        />

        <Button title="Create Account" onPress={handleSignUp} loading={loading} style={styles.signUpBtn} />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.paddingHorizontal,
    backgroundColor: COLORS.background,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.cardBackground,
    borderRadius: LAYOUT.cardRadius,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  signUpBtn: {
    marginTop: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
