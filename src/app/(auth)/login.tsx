import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { PrimaryButton } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { loginSchema, type LoginForm } from '@/lib/auth-schema';

// Turn a failed login into something the user can act on. Directus rejections
// arrive as `{ errors: [{ message, extensions: { code } }] }`; anything else
// is the network.
function loginErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const code = (error as { errors?: { extensions?: { code?: string } }[] })
      .errors?.[0]?.extensions?.code;
    if (code === 'INVALID_CREDENTIALS') return 'Email or password is incorrect.';
    return 'Sign-in failed — please try again.';
  }
  return "Couldn't reach the server — check your connection and try again.";
}

// Email/password sign-in against Directus. On success the auth context flips
// to signedIn and the root layout's gate swaps this group out for the app.
export default function LoginScreen() {
  const { signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);
    try {
      await signIn(values.email.trim(), values.password);
      // No navigation here — the gate unmounts this screen on success.
    } catch (error) {
      setServerError(loginErrorMessage(error));
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
          <View style={styles.header}>
            <ThemedText type="title">Welcome back</ThemedText>
            <ThemedText themeColor="body">Sign in to start quoting.</ThemedText>
          </View>

          <View style={styles.fields}>
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
                  autoComplete="current-password"
                  textContentType="password"
                  placeholder="••••••••"
                  onSubmitEditing={canSubmit ? () => onSubmit() : undefined}
                />
              )}
            />
          </View>

          {/* Server-side failure (bad credentials / offline) lives above the
              button so it survives field edits until the next attempt. */}
          {serverError && (
            <ThemedText type="caption" themeColor="danger">
              {serverError}
            </ThemedText>
          )}

          <PrimaryButton
            label="Sign in"
            onPress={onSubmit}
            disabled={!canSubmit}
            loading={submitting}
          />

          <View style={styles.footRow}>
            <ThemedText type="caption">Don&apos;t have an account yet? </ThemedText>
            <Link href="/sign-up" asChild>
              <Pressable hitSlop={Spacing.two}>
                <ThemedText type="caption" themeColor="ink" style={styles.footLink}>
                  Sign up
                </ThemedText>
              </Pressable>
            </Link>
          </View>
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
    gap: Spacing.four,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.two,
  },
  fields: {
    gap: Spacing.three,
  },
  footRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footLink: {
    fontWeight: '600',
  },
});
