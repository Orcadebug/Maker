import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link } from 'expo-router';

import { colors, spacing } from '../../src/theme';
import { Button, Input, H1, Body } from '../../src/components/ui';
import { resetPassword } from '../../src/services/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess('Reset link sent! Check your inbox.');

    setTimeout(() => {
      router.replace('/(auth)/login');
    }, 3000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <H1>Reset Password</H1>
              <Body style={styles.subtitle}>
                Enter your email and we'll send you a reset link
              </Body>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {success ? (
                <Text style={styles.successText}>{success}</Text>
              ) : null}

              <Button
                title="Send Reset Link"
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleResetPassword}
                style={styles.button}
              />
            </View>

            {/* Links */}
            <View style={styles.links}>
              <Link href="/(auth)/login" style={styles.link}>
                <Body style={styles.linkText}>
                  <Text style={styles.linkAccent}>Back to sign in</Text>
                </Body>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['3xl'],
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  subtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  form: {
    width: '100%',
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 14,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  successText: {
    color: colors.semantic.success,
    fontSize: 14,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing['2xl'],
    width: '100%',
  },
  links: {
    alignItems: 'center',
    marginTop: spacing['3xl'],
  },
  link: {
    // no extra styling needed
  },
  linkText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  linkAccent: {
    color: colors.primary[500],
  },
});
