import { Stack } from 'expo-router';

// Auth route group: login (and, next step, sign-up). Shown by the root
// layout's gate whenever there's no session.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
