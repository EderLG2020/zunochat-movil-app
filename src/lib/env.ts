import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Resuelve la URL base del backend.
 *
 * Orden de prioridad:
 *  1. EXPO_PUBLIC_API_URL (definida en .env) — siempre gana si está presente.
 *  2. Auto-detección por LAN: Expo expone el host que usa Metro para servir
 *     el proyecto (p.ej. "192.168.1.5:8081") en `expoConfig.hostUri`. Reusamos
 *     esa IP (puerto 8080) — así el mismo dispositivo que descarga el bundle
 *     puede alcanzar el backend sin configurar nada.
 *  3. Fallback por plataforma: 10.0.2.2 en el emulador Android (alias al
 *     localhost del host), localhost en iOS/web.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const lanHost = hostUri?.split(":")[0];
  if (lanHost && lanHost !== "localhost" && lanHost !== "127.0.0.1") {
    return `http://${lanHost}:8080`;
  }

  const fallbackHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  return `http://${fallbackHost}:8080`;
}

export const API_URL = resolveApiUrl();

/** ws(s)://.../ws/websocket — endpoint STOMP nativo, sin el handshake HTTP de SockJS. */
export const WS_URL = API_URL.replace(/^http/, "ws") + "/ws/websocket";
