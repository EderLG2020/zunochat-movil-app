import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

function subscribeNoop() {
  return () => {};
}

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * `useSyncExternalStore` returns the server snapshot ('light') during static
 * rendering/hydration and the real client snapshot right after, without an
 * extra render triggered from inside an effect.
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();
  return useSyncExternalStore(
    subscribeNoop,
    () => colorScheme,
    () => 'light',
  );
}
