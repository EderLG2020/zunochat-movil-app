import { Stack } from "expo-router";

import { useConversationsSync } from "@/hooks/useConversationsSync";
import { useHeartbeat } from "@/hooks/usePresence";

export default function AppLayout() {
  // Se monta una sola vez para todo el grupo (app): carga inicial de
  // conversaciones + suscripción WS a notificaciones, independiente de qué
  // pantalla del stack esté enfocada.
  useConversationsSync();
  // Mantiene viva la propia presencia (TTL 65s) mientras haya sesión —
  // sin esto, PresenceService marca "offline" tras ~1 min de inactividad
  // de escritura aunque el WS siga conectado.
  useHeartbeat();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}
