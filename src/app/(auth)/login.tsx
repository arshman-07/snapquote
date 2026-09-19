import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthSwitchLink, Nameplate } from '@/components/auth-chrome';
import { Field } from '@/components/field';
import { PrimaryButton, SecondaryButton } from '@/components/button';
import { Led } from '@/components/led';
import { Panel } from '@/components/panel';
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
//
// Layout: nameplate, then the headline stamped straight onto the chassis, then
// the form as one bolted-on panel ending in the red primary key.
export default function LoginScreen() {
  const { signIn, offlineSession, retryRestore } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Retry state for the offline notice below. `retryFailed` is cleared on each
  // new attempt so the message always reflects the latest one.
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  // Reconnected? Trade the stored refresh token for a session instead of making
  // the user type a password we already have a token for. On success the gate
  // unmounts this screen; on failure we say so and leave the form available.
  async function retry() {
    setRetrying(true);
    setRetryFailed(false);
    setServerError(null);
    const restored = await retryRestore();
    if (!restored) {
      setRetryFailed(true);
      setRetrying(false);
    }
  }

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
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Scrolls so the panel's shadow and the keyboard never clip the
              form on a short phone; centred when there's room to spare. */}
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <Nameplate />

            {/* Launch couldn't reach the server but the refresh token is still
                on the device. Explain that rather than silently presenting a
                form that can't succeed offline — and offer the one-tap way back
                in. An amber status light, not an error: nothing has gone wrong. */}
            {offlineSession && (
              <Panel screws={false} style={styles.offlinePanel}>
                <Led tone="warning" label="Offline" pulse />
                <ThemedText type="caption">
                  Your account is still on this device. Reconnect, then tap Try again — no need
                  to sign in.
                </ThemedText>
                {retryFailed && (
                  <ThemedText type="caption" themeColor="muted">
                    Still can&apos;t reach the server.
                  </ThemedText>
                )}
                <SecondaryButton
                  label={retrying ? 'Trying…' : 'Try again'}
                  onPress={retry}
                  disabled={retrying}
                />
              </Panel>
            )}

            <View style={styles.header}>
              <ThemedText type="title">Welcome back</ThemedText>
              <ThemedText themeColor="body">Sign in to start quoting.</ThemedText>
            </View>

            <Panel vents style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field
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
                  <Field
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

              {/* Server-side failure (bad credentials / offline) lives above
                  the key so it survives field edits until the next attempt. */}
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
            </Panel>

            <AuthSwitchLink prompt="Don't have an account yet?" action="Sign up" href="/sign-up" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.four,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.two,
  },
  offlinePanel: {
    gap: Spacing.three,
  },
  form: {
    gap: Spacing.four,
    // Clear the vent slots in the top-right corner.
    paddingTop: Spacing.five,
  },
});
