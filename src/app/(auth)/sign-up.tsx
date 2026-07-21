import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthErrorColor, AuthField } from '@/components/auth-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { registerSchema, type RegisterForm } from '@/lib/auth-schema';

// Map a failed sign-up to something actionable. signUp does two calls
// (register then login), so a Directus rejection could come from either;
// `extensions.code` tells us which. Anything without an `errors` array is the
// network.
function registerErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const code = (error as { errors?: { extensions?: { code?: string } }[] })
      .errors?.[0]?.extensions?.code;
    // Register no-ops on an existing email (Directus hides it to prevent
    // enumeration), so the follow-up login fails instead — most often because
    // the address is already taken, sometimes because the account still needs
    // email verification.
    if (code === 'INVALID_CREDENTIALS') {
      return 'This email may already be registered — try signing in instead.';
    }
    // Public registration turned off on the server.
    if (code === 'FORBIDDEN') return 'Sign-up isn’t available right now.';
    return 'Sign-up failed — please try again.';
  }
  return "Couldn't reach the server — check your connection and try again.";
}

// Create a Directus App User account (email + password), then drop straight
// into the app. The contractor/homeowner choice comes later, once the backend
// has a user_type field and lets users set it on their own profile.
export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);
    try {
      await signUp(values.email.trim(), values.password);
      // No navigation here — the gate unmounts this screen on success.
    } catch (error) {
      setServerError(registerErrorMessage(error));
      setSubmitting(false);
    }
  });

  const canSubmit = formState.isValid && !submitting;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">Create your account</ThemedText>
            <ThemedText themeColor="textSecondary">
              Sign up to start quoting.
            </ThemedText>
          </ThemedView>

          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <AuthField
                label="Email"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@example.com"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <AuthField
                label="Password"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder="At least 8 characters"
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <AuthField
                label="Confirm password"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder="••••••••"
                onSubmitEditing={canSubmit ? () => onSubmit() : undefined}
              />
            )}
          />

          {/* Server-side failure (email taken / offline / registration off)
              lives above the button so it survives field edits until the next
              attempt. */}
          {serverError && (
            <ThemedText type="small" style={styles.serverError}>
              {serverError}
            </ThemedText>
          )}

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView style={[styles.button, !canSubmit && styles.buttonDisabled]}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText type="smallBold" style={styles.buttonLabel}>
                  Create account
                </ThemedText>
              )}
            </ThemedView>
          </Pressable>

          <ThemedView style={styles.footRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Already have an account?{' '}
            </ThemedText>
            <Link href="/login" asChild>
              <Pressable hitSlop={8}>
                <ThemedText type="smallBold" style={styles.footLink}>
                  Sign in
                </ThemedText>
              </Pressable>
            </Link>
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  serverError: {
    color: AuthErrorColor,
  },
  button: {
    backgroundColor: Accent,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: '#fff',
  },
  pressed: {
    opacity: 0.7,
  },
  footRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footLink: {
    color: Accent,
  },
});
