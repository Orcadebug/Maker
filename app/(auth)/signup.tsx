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
import { signUp } from '../../src/services/auth';
import { useAuthStore } from '../../src/stores/authStore';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim(), password, name.trim());
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
            {/* Header */}
            <View style={styles.header}>
              <H1>Create Account</H1>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Name"
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />

              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.fieldGap}
              />

              <Input
                label="Password"
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.fieldGap}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Button
                title="Create Account"
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleSignUp}
                style={styles.button}
              />
            </View>

            {/* Links */}
            <View style={styles.links}>
              <Link href="/(auth)/login" style={styles.link}>
                <Body style={styles.linkText}>
                  Already have an account?{' '}
                  <Text style={styles.linkAccent}>Sign in</Text>
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
