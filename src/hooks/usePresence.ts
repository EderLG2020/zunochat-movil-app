import { useEffect } from "react";

import { presenceService } from "@/services/presence.service";
import { wsService } from "@/services/websocket.service";
import { useAuthStore } from "@/store/authStore";
import { usePresenceStore } from "@/store/presenceStore";

/**
 * Suscribe a /topic/presence.{userId} para cada id de la lista — se
 * resuscribe solo cuando el conjunto de ids realmente cambia (no en cada
 * render). Pensado para la lista de conversaciones y el header del chat activo.
 *
 * También pide el snapshot inicial por REST (GET /api/presence?ids=): el WS
 * solo avisa CAMBIOS a quien ya esté suscripto en el momento en que ocurren,
 * así que sin esto alguien que ya estaba online al abrir la app se veía
 * "desconectado" hasta el próximo cambio de estado suyo.
 */
export function usePresenceSubscriptions(userIds: number[]): void {
  const token = useAuthStore((s) => s.token);
  const applyEvent = usePresenceStore((s) => s.applyEvent);
  const idsKey = [...new Set(userIds)].sort((a, b) => a - b).join(",");

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",").map(Number) : [];
    if (!token || ids.length === 0) return;

    let cancelled = false;

    const subscribe = () => {
      ids.forEach((id) => wsService.subscribeToPresence(id, applyEvent));
    };

    if (wsService.isConnected) subscribe();
    else wsService.connect(token, subscribe);

    presenceService
      .snapshot(ids)
      .then((results) => {
        if (cancelled) return;
        results.forEach((r) => applyEvent({ userId: r.userId, username: "", online: r.online, lastSeen: r.lastSeen }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      ids.forEach((id) => wsService.unsubscribeFromPresence(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, token]);
}

/** true/false si se conoce el estado en vivo de ese usuario, undefined si aún no llegó ningún evento. */
export function useIsOnline(userId: number | undefined): boolean | undefined {
  return usePresenceStore((s) => (userId != null ? s.byUserId[userId]?.online : undefined));
}

/**
 * Mantiene vivo el TTL de presencia (65s) del propio usuario mientras esté
 * autenticado. Sin esto, PresenceService marca "offline" a cualquiera que no
 * escriba nada por más de 65s, aunque el WebSocket siga conectado — el ping
 * STOMP (heartbeatIncoming/Outgoing) solo mantiene viva la conexión, no toca
 * la presencia de aplicación. Se monta una sola vez en (app)/_layout.tsx,
 * independiente de qué pantalla esté enfocada.
 */
export function useHeartbeat(): void {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    const send = () => {
      if (wsService.isConnected) wsService.sendHeartbeat();
    };

    if (wsService.isConnected) send();
    else wsService.connect(token, send);

    const interval = setInterval(send, 30_000);
    return () => clearInterval(interval);
  }, [token]);
}
