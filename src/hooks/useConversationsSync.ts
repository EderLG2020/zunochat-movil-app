import { useEffect, useRef } from "react";

import { wsService } from "@/services/websocket.service";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useConversationsStore } from "@/store/conversationsStore";
import type { WsOutboundMessage } from "@/types";

/**
 * Mantiene la lista global de conversaciones sincronizada mientras hay
 * sesión activa: carga inicial + suscripción a /user/queue/notifications.
 * Se monta una única vez en el layout del grupo (app), sin importar qué
 * pantalla esté enfocada.
 */
export function useConversationsSync(): void {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.userId ?? null);
  const fetch = useConversationsStore((s) => s.fetch);

  const activeConversationIdRef = useRef<number | null>(null);
  useEffect(
    () =>
      useChatStore.subscribe((s) => {
        activeConversationIdRef.current = s.activeConversation?.conversationId ?? null;
      }),
    [],
  );

  useEffect(() => {
    if (!token) return;
    void fetch();

    const onNotification = (data: unknown) => {
      useConversationsStore.getState().applyIncomingMessage(data as WsOutboundMessage, userId, activeConversationIdRef.current);
    };

    const subscribe = () => wsService.subscribeToNotifications(onNotification);
    if (wsService.isConnected) subscribe();
    else wsService.connect(token, subscribe);

    return () => {
      wsService.unsubscribeFromNotifications();
    };
  }, [token, userId, fetch]);
}
