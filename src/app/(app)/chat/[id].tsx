import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Avatar } from "@/components/ui/Avatar";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ContactProfileSheet } from "@/components/chat/ContactProfileSheet";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";
import { TypingDots } from "@/components/chat/TypingDots";
import { useTheme } from "@/hooks/use-theme";
import { useMessages } from "@/hooks/useMessages";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useIsOnline } from "@/hooks/usePresence";
import { dayLabel } from "@/lib/format";
import { newClientMessageId } from "@/lib/id";
import { conversationService, messageService, userService } from "@/services";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useConversationsStore } from "@/store/conversationsStore";
import type { MessageResponse, ReadReceiptEvent, TypingEvent } from "@/types";

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);

  const currentUserId = useAuthStore((s) => s.user?.userId ?? null);
  const activeConversationRaw = useChatStore((s) => s.activeConversation);
  const conversationsListItem = useConversationsStore((s) =>
    s.items.find((c) => c.conversationId === conversationId),
  );
  // Si la pantalla se abrió sin pasar por la lista (deep link, fast refresh),
  // recupera los datos de la conversación desde el store global de la lista.
  const activeConversation =
    activeConversationRaw?.conversationId === conversationId ? activeConversationRaw : conversationsListItem ?? null;

  const messages = useChatStore((s) => s.messages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const markMessagesAsRead = useChatStore((s) => s.markMessagesAsRead);
  const typingUserId = useChatStore((s) => s.typingUserId);
  const setTypingUserId = useChatStore((s) => s.setTypingUserId);

  const { isLoading, isLoadingMore, error, hasMore, loadMore } = useMessages(conversationId || null);
  const showInitialLoader = isLoading && messages.length === 0;
  const listRef = useRef<FlatList>(null);

  const isGroup = activeConversation?.type === "GROUP";

  // Menú de opciones del chat (silenciar / bloquear) — bloquear no aplica a GROUP
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    userService.listBlocked().then((list) => setBlockedIds(new Set(list.map((b) => b.id)))).catch(() => {});
  }, []);
  const isBlocked = activeConversation?.otherUserId != null ? blockedIds.has(activeConversation.otherUserId) : false;

  const toggleMute = async () => {
    if (!activeConversation) return;
    setMenuOpen(false);
    const updated = await conversationService.setMuted(activeConversation.conversationId, { muted: !activeConversation.muted });
    setActiveConversation(updated);
  };

  const toggleBlock = () => {
    if (!activeConversation || activeConversation.otherUserId == null) return;
    setMenuOpen(false);
    const otherId = activeConversation.otherUserId;
    if (isBlocked) {
      userService.unblock(otherId).then(() => setBlockedIds((prev) => { const next = new Set(prev); next.delete(otherId); return next; }));
      return;
    }
    Alert.alert("Bloquear usuario", `¿Bloquear a ${activeConversation.otherUsername}? No podrán enviarse mensajes.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Bloquear",
        style: "destructive",
        onPress: () => userService.block(otherId).then(() => setBlockedIds((prev) => new Set(prev).add(otherId))),
      },
    ]);
  };

  // Presencia en vivo del contacto actual — sin sentido para GROUP
  const liveOnline = useIsOnline(activeConversation?.otherUserId ?? undefined);

  // eventType "MESSAGE_UPDATED" (edición/borrado) actualiza el mensaje existente
  // en vez de agregar uno nuevo — mismo topic, distinto tratamiento.
  const handleWsMessage = useCallback(
    (msg: MessageResponse, eventType: string) => {
      if (eventType === "MESSAGE_UPDATED") updateMessage(msg);
      else appendMessage(msg);
    },
    [appendMessage, updateMessage],
  );

  const typingClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTyping = useCallback(
    (evt: TypingEvent) => {
      if (evt.userId === currentUserId) return;
      setTypingUserId(evt.typing ? evt.userId : null);
      if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
      if (evt.typing) typingClearTimer.current = setTimeout(() => setTypingUserId(null), 3_000);
    },
    [currentUserId, setTypingUserId],
  );

  const handleReadReceipt = useCallback(
    (evt: ReadReceiptEvent) => {
      if (!conversationId) return;
      markMessagesAsRead(conversationId, evt.readByUserId);
    },
    [conversationId, markMessagesAsRead],
  );

  useWebSocket({
    conversationId: conversationId || null,
    onMessage: handleWsMessage,
    onTyping: handleTyping,
    onReadReceipt: handleReadReceipt,
  });

  useEffect(() => {
    if (!conversationId) return;
    messageService.markRead({ conversationId }).catch(() => {});
  }, [conversationId]);

  useEffect(() => () => {
    if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
  }, []);

  const handleSend = async (text: string) => {
    if (!conversationId) return;
    const msg = await messageService.send({
      conversationId,
      type: "TEXT",
      textContent: text,
      clientMessageId: newClientMessageId(),
    });
    appendMessage(msg); // el WS también lo trae — el store deduplica por messageId
  };

  // FlatList invertida: data en orden "más nuevo primero". La divisoria de día
  // y el inicio de racha de un mismo remitente se calculan contra el vecino
  // MÁS ANTIGUO (siguiente índice), que es el orden de lectura real.
  const renderItems = useMemo(() => {
    const desc = [...messages].reverse();
    return desc.map((msg, i) => {
      const older = desc[i + 1] ?? null;
      const showDayDivider = !older || dayLabel(msg.sentAt) !== dayLabel(older.sentAt);
      const isGroupStart = showDayDivider || !older || msg.senderId !== older.senderId;
      return { msg, showDayDivider, isGroupStart };
    });
  }, [messages]);

  if (!conversationId) return null;

  const displayName = isGroup ? activeConversation?.groupName ?? "Grupo" : activeConversation?.otherUsername ?? "Conversación";
  const avatarSeed = isGroup ? conversationId : activeConversation?.otherUserId ?? conversationId;
  const isOnline = liveOnline ?? activeConversation?.status === "ONLINE";
  const statusLabel = typingUserId
    ? "Escribiendo..."
    : isGroup
      ? `${activeConversation?.members?.length ?? 0} miembros`
      : isOnline
        ? "En línea"
        : "Desconectado";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.chatBackground }]} edges={["top", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <Pressable
          style={styles.headerInfo}
          disabled={isGroup}
          onPress={() => {
            if (!isGroup) setShowProfile(true);
          }}
        >
          <Avatar seed={avatarSeed} label={displayName} size={36} />
          <View style={styles.headerTexts}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.headerSubtitle, { color: typingUserId ? theme.primary : theme.textSecondary }]}>
              {statusLabel}
            </Text>
          </View>
        </Pressable>
        {activeConversation?.ephemeralEnabled && <Text style={styles.ephemeralIcon}>⏳</Text>}
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} style={styles.menuButton}>
          <Text style={[styles.menuIcon, { color: theme.text }]}>⋮</Text>
        </Pressable>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.actionSheet, { backgroundColor: theme.card }]}>
            <Pressable onPress={toggleMute} style={[styles.actionRow, !isGroup && { borderBottomColor: theme.border }]}>
              <Text style={{ fontSize: 14, color: theme.text }}>
                {activeConversation?.muted ? "🔔 Reactivar notificaciones" : "🔇 Silenciar conversación"}
              </Text>
            </Pressable>
            {!isGroup && (
              <Pressable onPress={toggleBlock} style={styles.actionRow}>
                <Text style={{ fontSize: 14, color: theme.danger }}>{isBlocked ? "✅ Desbloquear usuario" : "🚫 Bloquear usuario"}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      <ContactProfileSheet
        visible={showProfile}
        conversation={activeConversation}
        currentUserId={currentUserId ?? 0}
        onClose={() => setShowProfile(false)}
        onConversationUpdated={setActiveConversation}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {error && <ErrorBanner message={error} onRetry={hasMore ? loadMore : undefined} />}

        {showInitialLoader ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={renderItems}
            inverted
            keyExtractor={(item) => String(item.msg.messageId)}
            renderItem={({ item }) => (
              <View>
                {item.showDayDivider && (
                  <View style={styles.dayDividerRow}>
                    <View style={[styles.dayChip, { backgroundColor: theme.backgroundElement }]}>
                      <Text style={[styles.dayChipText, { color: theme.textSecondary }]}>{dayLabel(item.msg.sentAt)}</Text>
                    </View>
                  </View>
                )}
                <MessageBubble message={item.msg} currentUserId={currentUserId ?? 0} isGroupStart={item.isGroupStart} />
              </View>
            )}
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.4}
            ListFooterComponent={isLoadingMore ? <FooterLoader color={theme.primary} /> : null}
            ListHeaderComponent={typingUserId ? <TypingDots /> : null}
            contentContainerStyle={styles.listContent}
          />
        )}

        {isBlocked ? (
          <View style={[styles.blockedBanner, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: "center" }}>
              Bloqueaste a {activeConversation?.otherUsername} — desbloquéalo para volver a escribirle.
            </Text>
          </View>
        ) : (
          <MessageInput conversationId={conversationId} onSend={handleSend} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FooterLoader({ color }: { color: string }) {
  return (
    <View style={{ paddingVertical: 12, alignItems: "center" }}>
      <Text style={{ color, fontSize: 12 }}>Cargando mensajes anteriores…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 28,
    lineHeight: 28,
  },
  menuButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  actionRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  blockedBanner: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ephemeralIcon: {
    fontSize: 16,
  },
  headerTexts: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
  },
  listContent: {
    paddingVertical: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayDividerRow: {
    alignItems: "center",
    marginVertical: 10,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
