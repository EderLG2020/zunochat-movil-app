import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { authService } from "@/services/auth.service";
import { setAuthToken, setUnauthorizedHandler } from "@/services/token";
import { wsService } from "@/services/websocket.service";
import type { AuthResponse } from "@/types";

interface AuthUser {
  userId: number | null;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  login: (auth: AuthResponse) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
  refreshIfNeeded: () => Promise<void>;
}

/** Si al JWT le queda menos de esto, se renueva sola sin esperar a que expire. */
const REFRESH_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2h
/** Cada cuánto se revisa mientras la app sigue abierta (además del check al volver a primer plano, ver app/_layout.tsx). */
const REFRESH_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30min

/** Decodifica el userId del JWT sin dependencias externas de verificación. */
function decodeUserId(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = decodeBase64Url(payload);
    const claims = JSON.parse(json);
    return typeof claims.userId === "number" ? claims.userId : null;
  } catch {
    return null;
  }
}

/** Milisegundos restantes hasta que expire el JWT (negativo si ya expiró). null si no se pudo decodificar. */
function getMsUntilExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const claims = JSON.parse(decodeBase64Url(payload));
    return typeof claims.exp === "number" ? claims.exp * 1000 - Date.now() : null;
  } catch {
    return null;
  }
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Decodificador base64 → string autocontenido: ni Hermes ni el runtime de
 * React Native exponen `atob`/`Buffer` de forma global, así que no podemos
 * apoyarnos en ellos (a diferencia del cliente web).
 */
function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  let bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of normalized) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue; // ignora '=' de padding u otros caracteres
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return decodeURIComponent(bytes.map((b) => "%" + b.toString(16).padStart(2, "0")).join(""));
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,

      // Renueva el JWT en silencio si le queda poco tiempo — evita que la
      // sesión expire "en seco" a las 24h. No reconecta el WS: el token
      // nuevo solo hace falta para requests REST, la conexión WS ya
      // autenticada sigue viva con el viejo hasta que se cierre.
      refreshIfNeeded: async () => {
        const { token, isAuthenticated } = get();
        if (!token || !isAuthenticated) return;
        const msLeft = getMsUntilExpiry(token);
        if (msLeft === null || msLeft > REFRESH_THRESHOLD_MS) return;

        try {
          const auth = await authService.refresh(token);
          setAuthToken(auth.token);
          set((state) => ({
            token: auth.token,
            user: state.user ? { ...state.user, role: auth.role, permissions: auth.permissions } : state.user,
          }));
        } catch {
          // Fuera de la ventana de gracia o cuenta ya no válida — el
          // próximo 401 real dispara el logout normal.
        }
      },

      login: (auth: AuthResponse) => {
        const user: AuthUser = {
          userId: decodeUserId(auth.token),
          username: auth.username,
          email: auth.email,
          role: auth.role,
          permissions: auth.permissions,
        };
        setAuthToken(auth.token);
        set({ user, token: auth.token, isAuthenticated: true });
        wsService.connect(auth.token);
      },

      logout: () => {
        setAuthToken(null);
        set({ user: null, token: null, isAuthenticated: false });
        wsService.disconnect();
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "zunochat-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        // Se ejecuta una vez restaurado el storage: sincroniza el cache en
        // memoria del token y reconecta el WS si había sesión activa.
        if (state?.token) {
          setAuthToken(state.token);
          wsService.connect(state.token);
          void state.refreshIfNeeded();
          setInterval(() => void state.refreshIfNeeded(), REFRESH_CHECK_INTERVAL_MS);
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);

// api.config.ts avisa por aquí cuando el backend responde 401, sin importar
// el store directamente (rompería el ciclo store → services → store).
setUnauthorizedHandler(() => useAuthStore.getState().logout());
