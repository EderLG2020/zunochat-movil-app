import { useEffect } from "react";
import { AppState, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { useAuthStore } from "@/store/authStore";

SplashScreen.preventAutoHideAsync();

/** Revisa si el JWT necesita renovarse cada vez que la app vuelve a primer
 * plano — en móvil la app se va a background/foreground mucho más seguido
 * que una pestaña web queda inactiva, así que esto complementa (no
 * reemplaza) el chequeo periódico de authStore. */
function useRefreshOnForeground() {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void useAuthStore.getState().refreshIfNeeded();
    });
    return () => sub.remove();
  }, []);
}

/** Redirige entre el grupo (auth) y (app) según el estado de sesión. */
function useProtectedRedirect(hasHydrated: boolean, isAuthenticated: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [hasHydrated, isAuthenticated, segments, router]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useProtectedRedirect(hasHydrated, isAuthenticated);
  useRefreshOnForeground();

  useEffect(() => {
    if (hasHydrated) SplashScreen.hideAsync();
  }, [hasHydrated]);

  if (!hasHydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
