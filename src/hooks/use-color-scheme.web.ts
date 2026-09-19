import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Never fires — the hydration flag flips by virtue of the client snapshot being
// read at all, not by any external change, so there is nothing to subscribe to.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 *
 * The server snapshot is `false` and the client snapshot `true`, so the first
 * client render matches the server HTML and the real scheme takes over on
 * hydration. `useSyncExternalStore` is what React provides for exactly this
 * server/client split; the older `useState` + `useEffect` flag did the same job
 * but by cascading a second render, which the React Compiler rules now reject.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
