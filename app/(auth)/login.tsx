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
import { signIn } from '../../src/services/auth';
import { useAuthStore } from '../../src/stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace('/(main)/(tabs)/home');
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
            {/* Logo area */}
            <View style={styles.logoArea}>
              <H1 style={styles.appName}>Maker</H1>
              <Body style={styles.tagline}>Build mini-apps with AI</Body>
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

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.fieldGap}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Button
                title="Sign In"
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleSignIn}
                style={styles.button}
              />
            </View>

            {/* Links */}
            <View style={styles.links}>
              <Link href="/(auth)/signup" style={styles.link}>
                <Body style={styles.linkText}>
                  Don't have an account?{' '}
                  <Text style={styles.linkAccent}>Sign up</Text>
                </Body>
              </Link>

              <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
                <Body style={styles.linkText}>
                  <Text style={styles.linkAccent}>Forgot password?</Text>
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
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing['5xl'],
  },
  appName: {
    color: colors.primary[500],
    marginBottom: spacing.xs,
  },
  tagline: {
    color: colors.text.secondary,
  },
  form: {
    width: '100%',
  },
  fieldGap: {
    marginTop: spacing.lg,
  },
  errorText: {
    color: colors.semantic.error,
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
    gap: spacing.md,
  },
  link: {
    // no extra styling needed
  },
  forgotLink: {
    marginTop: spacing.xs,
  },
  linkText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  linkAccent: {
    color: colors.primary[500],
  },
});
