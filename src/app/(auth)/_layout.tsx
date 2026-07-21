import { Stack } from 'expo-router';

// Auth route group: login + sign-up. Shown by the root layout's gate whenever
// there's no session; expo-router auto-registers both screens from this folder.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
