import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";

import { WS_URL } from "@/lib/env";
import type {
  MessageResponse,
  PresenceEvent,
  ReadReceiptEvent,
  TypingEvent,
  WsInboundMessage,
  WsOutboundMessage,
} from "@/types";

// Convierte el shape del backend → shape que usa la app
export function normalizeWsMessage(raw: WsOutboundMessage): MessageResponse {
  return {
    messageId: raw.messageId,
    conversationId: raw.conversationId,
    senderId: raw.senderId,
    receiverId: raw.receiverId,
    type: raw.type,
    textContent: raw.textContent,
    payload: raw.payload,
    payloadType: raw.payloadType,
    fileUrls: raw.fileUrls ?? [],
    status: raw.status,
    sentAt: raw.sentAt,
    readAt: null,
    deleted: raw.deleted,
    editedAt: raw.editedAt,
  };
}

// eventType: "MESSAGE_RECEIVED" (mensaje nuevo) | "MESSAGE_UPDATED" (editado o borrado — mismo messageId)
type MessageHandler = (msg: MessageResponse, eventType: string) => void;
type TypingHandler = (evt: TypingEvent) => void;
type ReadHandler = (evt: ReadReceiptEvent) => void;
type PresenceHandler = (evt: PresenceEvent) => void;

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private onConnectQueue: (() => void)[] = [];

  connect(token: string, onReady?: () => void): void {
    if (this.client?.connected) {
      onReady?.();
      return;
    }
    if (onReady) this.onConnectQueue.push(onReady);
    if (this.client) return; // ya activándose

    this.client = new Client({
      // Conecta directo al endpoint WS nativo de Spring (/ws/websocket), sin
      // pasar por el handshake HTTP de SockJS — sockjs-client depende de APIs
      // de streaming XHR que no existen en React Native. El token también va
      // por query param como respaldo (además del header de abajo) para el
      // caso de proxies/túneles de desarrollo que descarten headers en el
      // upgrade de WebSocket.
      brokerURL: `${WS_URL}?token=${encodeURIComponent(token)}`,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5_000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      // Requerido en React Native: su implementación de WebSocket no añade el
      // byte NULL de fin de frame STOMP de forma consistente en frames de texto.
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      onConnect: () => {
        const queue = [...this.onConnectQueue];
        this.onConnectQueue = [];
        queue.forEach((fn) => fn());
      },
      onStompError: (f) => console.error("[WS] Error STOMP:", f.headers["message"]),
      onDisconnect: () => {
        this.subscriptions.clear();
      },
      onWebSocketError: (e) => console.error("[WS] Error WebSocket:", e),
    });
    this.client.activate();
  }

  disconnect(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    this.onConnectQueue = [];
    this.client?.deactivate();
    this.client = null;
  }

  get isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  private _subscribe(dest: string, handler: (f: IMessage) => void): void {
    if (!this.client?.connected) return;
    const existing = this.subscriptions.get(dest);
    if (existing) {
      existing.unsubscribe();
      this.subscriptions.delete(dest);
    }
    this.subscriptions.set(dest, this.client.subscribe(dest, handler));
  }

  unsubscribe(dest: string): void {
    const sub = this.subscriptions.get(dest);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(dest);
    }
  }

  private _publish(dest: string, body: object): void {
    if (!this.client?.connected) return;
    this.client.publish({ destination: dest, body: JSON.stringify(body) });
  }

  subscribeToConversation(id: number, handler: MessageHandler): void {
    this._subscribe(`/topic/conversation.${id}`, (f) => {
      const raw = JSON.parse(f.body) as WsOutboundMessage;
      handler(normalizeWsMessage(raw), raw.eventType);
    });
  }
  unsubscribeFromConversation(id: number): void {
    this.unsubscribe(`/topic/conversation.${id}`);
  }

  subscribeToTyping(id: number, handler: TypingHandler): void {
    this._subscribe(`/topic/typing.${id}`, (f) => handler(JSON.parse(f.body) as TypingEvent));
  }
  unsubscribeFromTyping(id: number): void {
    this.unsubscribe(`/topic/typing.${id}`);
  }

  subscribeToReadReceipts(id: number, handler: ReadHandler): void {
    this._subscribe(`/topic/read.${id}`, (f) => handler(JSON.parse(f.body) as ReadReceiptEvent));
  }
  unsubscribeFromReadReceipts(id: number): void {
    this.unsubscribe(`/topic/read.${id}`);
  }

  subscribeToPresence(userId: number, handler: PresenceHandler): void {
    this._subscribe(`/topic/presence.${userId}`, (f) => handler(JSON.parse(f.body)));
  }
  unsubscribeFromPresence(userId: number): void {
    this.unsubscribe(`/topic/presence.${userId}`);
  }

  subscribeToNotifications(handler: (data: unknown) => void): void {
    this._subscribe("/user/queue/notifications", (f) => handler(JSON.parse(f.body)));
  }
  unsubscribeFromNotifications(): void {
    this.unsubscribe("/user/queue/notifications");
  }

  sendMessage(payload: WsInboundMessage): void {
    this._publish("/app/chat.send", payload);
  }
  sendTyping(conversationId: number, typing: boolean): void {
    this._publish("/app/chat.typing", { conversationId, typing });
  }
  sendRead(conversationId: number): void {
    this._publish("/app/chat.read", { conversationId });
  }
  sendHeartbeat(): void {
    this._publish("/app/heartbeat", {});
  }
}

export const wsService = new WebSocketService();
