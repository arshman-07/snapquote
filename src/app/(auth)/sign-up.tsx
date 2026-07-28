import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { PrimaryButton } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
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

// Create a Directus App User account (email + password) plus a small profile —
// account type and a name, and for contractors a company name — then drop
// straight into the app. The profile fields are written after login (the public
// register endpoint can't set them); see `signUp` in the auth context.
export default function SignUpScreen() {
  const { signUp } = useAuth();
  const theme = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      userType: undefined,
      fullName: '',
      companyName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Drives which profile fields show and how the name field is labelled.
  const userType = useWatch({ control, name: 'userType' });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);
    try {
      // Schema guarantees userType is set before submit is reachable.
      await signUp({
        email: values.email.trim(),
        password: values.password,
        userType: values.userType!,
        fullName: values.fullName,
        companyName: values.companyName,
      });
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
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* This form runs to six fields once a type is picked, so it has to
              scroll — centring it in a fixed view clipped the bottom. */}
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <ThemedText type="title">Create your account</ThemedText>
              <ThemedText themeColor="body">Sign up to start quoting.</ThemedText>
            </View>

            {/* Account type — decides which profile fields apply below.
                Selection is an `ink` fill, not the accent: this is a control,
                and the accent stays reserved for progress, material tier and
                status badges. */}
            <Controller
              control={control}
              name="userType"
              render={({ field, fieldState }) => (
                <View style={styles.field}>
                  <ThemedText type="label">I’m a…</ThemedText>
                  <View style={[styles.segment, { borderColor: theme.hairline }]}>
                    {(['contractor', 'homeowner'] as const).map((type, index) => {
                      const selected = field.value === type;
                      return (
                        <Pressable
                          key={type}
                          onPress={() => field.onChange(type)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          style={[
                            styles.segmentItem,
                            selected && { backgroundColor: theme.ink },
                            index === 1 && {
                              borderLeftWidth: StyleSheet.hairlineWidth,
                              borderLeftColor: theme.hairline,
                            },
                          ]}>
                          <ThemedText
                            type="bodyBold"
                            themeColor={selected ? 'onInk' : 'body'}>
                            {type === 'contractor' ? 'Contractor' : 'Homeowner'}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  {fieldState.error && (
                    <ThemedText type="caption" themeColor="danger">
                      {fieldState.error.message}
                    </ThemedText>
                  )}
                </View>
              )}
            />

            <View style={styles.fields}>
              {/* Contractors give a company name; the name field below then asks
                  for the owner. Homeowners just give their own name. */}
              {userType === 'contractor' && (
                <Controller
                  control={control}
                  name="companyName"
                  render={({ field, fieldState }) => (
                    <AuthField
                      label="Company name"
                      value={field.value}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                      autoCapitalize="words"
                      autoComplete="organization"
                      placeholder="Acme Renovations"
                    />
                  )}
                />
              )}
              {userType && (
                <Controller
                  control={control}
                  name="fullName"
                  render={({ field, fieldState }) => (
                    <AuthField
                      label={userType === 'contractor' ? "Company owner’s name" : 'Your name'}
                      value={field.value}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                      autoCapitalize="words"
                      autoComplete="name"
                      placeholder="Jane Smith"
                    />
                  )}
                />
              )}

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
            </View>

            {/* Server-side failure (email taken / offline / registration off)
                lives above the button so it survives field edits until the next
                attempt. */}
            {serverError && (
              <ThemedText type="caption" themeColor="danger">
                {serverError}
              </ThemedText>
            )}

            <PrimaryButton
              label="Create account"
              onPress={onSubmit}
              disabled={!canSubmit}
              loading={submitting}
            />

            <View style={styles.footRow}>
              <ThemedText type="caption">Already have an account? </ThemedText>
              <Link href="/login" asChild>
                <Pressable hitSlop={Spacing.two}>
                  <ThemedText type="caption" themeColor="ink" style={styles.footLink}>
                    Sign in
                  </ThemedText>
                </Pressable>
              </Link>
            </View>
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
  safeArea: {
    flex: 1,
  },
  flex: {
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
  field: {
    gap: Spacing.two,
  },
  fields: {
    gap: Spacing.three,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.control,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
