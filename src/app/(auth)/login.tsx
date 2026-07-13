import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { loginSchema, type LoginForm } from '@/lib/auth-schema';

// Same local error red as the quote flow (the theme has no error key).
const ErrorColor = '#e5484d';

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
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">Welcome back</ThemedText>
            <ThemedText themeColor="textSecondary">
              Sign in to start quoting.
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
                autoComplete="current-password"
                textContentType="password"
                placeholder="••••••••"
                onSubmitEditing={canSubmit ? () => onSubmit() : undefined}
              />
            )}
          />

          {/* Server-side failure (bad credentials / offline) lives above the
              button so it survives field edits until the next attempt. */}
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
                  Sign in
                </ThemedText>
              )}
            </ThemedView>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary" style={styles.footNote}>
            Don&apos;t have an account yet? Sign-up is coming soon — ask your
            admin for access in the meantime.
          </ThemedText>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

// One labelled auth input — same field chrome as the quote flow's inputs.
function AuthField({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.inputRow}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          {...inputProps}
        />
      </ThemedView>
      {error && (
        <ThemedText type="small" style={{ color: ErrorColor }}>
          {error}
        </ThemedText>
      )}
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
  field: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? Spacing.three : Spacing.two,
    fontSize: 16,
  },
  serverError: {
    color: ErrorColor,
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
  footNote: {
    textAlign: 'center',
  },
});
