import { create } from "zustand";

import { buildMessagePreview } from "@/lib/format";
import { conversationService } from "@/services/conversation.service";
import type { ConversationResponse, WsOutboundMessage } from "@/types";

/**
 * Lista de conversaciones como store global (no como hook local).
 *
 * A diferencia del cliente web —donde ChatPage vive en una sola página y un
 * hook local basta—, Expo Router mantiene las pantallas del stack montadas al
 * navegar. Si esto fuera un hook por pantalla, volver de un chat a la lista
 * no dispararía un refetch (la pantalla nunca se desmontó). Con un store
 * global, cualquier pantalla puede leer/mutar la misma lista y la suscripción
 * WS de notificaciones (montada una sola vez en el layout del grupo (app))
 * la mantiene al día sin importar qué pantalla esté enfocada.
 */
interface ConversationsState {
  items: ConversationResponse[];
  isLoading: boolean;
  error: string | null;
  fetch: (silent?: boolean) => Promise<void>;
  upsertLocal: (conv: ConversationResponse) => void;
  applyIncomingMessage: (msg: WsOutboundMessage, currentUserId: number | null, activeConversationId: number | null) => void;
}

export const useConversationsStore = create<ConversationsState>()((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetch: async (silent = false) => {
    try {
      if (!silent) set({ isLoading: true });
      set({ error: null });
      const page = await conversationService.list(0, 50);
      set({ items: page.content });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : "Error al cargar conversaciones" });
    } finally {
      if (!silent) set({ isLoading: false });
    }
  },

  // Inserta/reemplaza una conversación recién creada (ej. tras iniciar un
  // chat nuevo desde el buscador de usuarios) sin esperar al round-trip WS.
  upsertLocal: (conv) => {
    const prev = get().items;
    const exists = prev.some((c) => c.conversationId === conv.conversationId);
    set({ items: exists ? prev.map((c) => (c.conversationId === conv.conversationId ? conv : c)) : [conv, ...prev] });
  },

  // Notificación WS de un mensaje nuevo → actualiza esa conversación en
  // memoria (preview, orden, no-leídos) con los datos que ya trae el propio
  // evento, sin re-pedir la lista completa. Si la conversación no existe
  // todavía en el estado local (chat nuevo), sí hace falta un refetch puntual.
  applyIncomingMessage: (msg, currentUserId, activeConversationId) => {
    if (msg?.eventType !== "MESSAGE_RECEIVED" || typeof msg.conversationId !== "number") return;

    const prev = get().items;
    const idx = prev.findIndex((c) => c.conversationId === msg.conversationId);
    if (idx === -1) {
      setTimeout(() => void get().fetch(true), 300);
      return;
    }

    const current = prev[idx];
    const isMine = msg.senderId === currentUserId;
    const isOpen = activeConversationId === msg.conversationId;
    const updated: ConversationResponse = {
      ...current,
      lastMessagePreview: buildMessagePreview(msg.type, msg.textContent, msg.payloadType),
      lastMessageIsMine: isMine,
      lastMessageAt: msg.sentAt,
      unreadCount: isMine || isOpen ? current.unreadCount : current.unreadCount + 1,
    };

    const rest = prev.filter((_, i) => i !== idx);
    set({ items: [updated, ...rest] });
  },
}));
