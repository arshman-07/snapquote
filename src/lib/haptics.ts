import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * The tactile "click" of a physical key going down. Fire-and-forget: a device
 * without a haptic engine (or web, where the API is absent) just stays silent.
 */
export function keyClick() {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
