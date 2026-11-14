import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { StreakBadge } from "@/components/chat/StreakBadge";
import { useTheme } from "@/hooks/use-theme";
import { useIsOnline } from "@/hooks/usePresence";
import { relativeTime } from "@/lib/format";
import type { ConversationResponse } from "@/types";

interface Props {
  conversation: ConversationResponse;
  onPress: (conversation: ConversationResponse) => void;
}

export const ConversationRow = memo(function ConversationRow({ conversation, onPress }: Props) {
  const theme = useTheme();
  const { conversationId, otherUserId, otherUsername, lastMessagePreview, lastMessageIsMine, lastMessageAt, unreadCount, status, muted } =
    conversation;
  const isGroup = conversation.type === "GROUP";
  const displayName = isGroup ? conversation.groupName ?? "Grupo" : otherUsername ?? "";
  const preview = lastMessageIsMine ? `Tú: ${lastMessagePreview ?? ""}` : (lastMessagePreview ?? "");

  // Presencia en vivo por WS si ya llegó algún evento; si no, cae al status del REST inicial.
  // Sin sentido en GROUP — no hay un único "otro usuario" del que trackear presencia.
  const liveOnline = useIsOnline(otherUserId ?? undefined);
  const isOnline = !isGroup && (liveOnline ?? status === "ONLINE");

  return (
    <Pressable
      onPress={() => onPress(conversation)}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border }, pressed && { backgroundColor: theme.backgroundElement }]}
    >
      <Avatar seed={isGroup ? conversationId : otherUserId ?? 0} label={displayName} size={48} online={isOnline} />
      <View style={styles.middle}>
        <View style={styles.topLine}>
          <View style={styles.usernameRow}>
            {muted && <Text style={styles.mutedIcon}>🔇</Text>}
            <Text numberOfLines={1} style={[styles.username, { color: theme.text }]}>
              {displayName}
            </Text>
            {!isGroup && <StreakBadge conversationId={conversationId} />}
          </View>
          {!!lastMessageAt && <Text style={[styles.time, { color: theme.textSecondary }]}>{relativeTime(lastMessageAt)}</Text>}
        </View>
        <View style={styles.bottomLine}>
          <Text numberOfLines={1} style={[styles.preview, { color: theme.textSecondary }]}>
            {preview || "Sin mensajes aún"}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: muted ? theme.textSecondary : theme.primary }]}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  middle: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  mutedIcon: {
    fontSize: 11,
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  time: {
    fontSize: 12,
  },
  bottomLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  preview: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});
