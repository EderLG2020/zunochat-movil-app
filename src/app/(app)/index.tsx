import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Avatar } from "@/components/ui/Avatar";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConversationRow } from "@/components/chat/ConversationRow";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import { UserSearchBar } from "@/components/chat/UserSearchBar";
import { useTheme } from "@/hooks/use-theme";
import { usePresenceSubscriptions } from "@/hooks/usePresence";
import { useStreakSubscriptions } from "@/hooks/useStreaks";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useConversationsStore } from "@/store/conversationsStore";
import type { ConversationResponse } from "@/types";

export default function ConversationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const items = useConversationsStore((s) => s.items);
  const isLoading = useConversationsStore((s) => s.isLoading);
  const error = useConversationsStore((s) => s.error);
  const fetch = useConversationsStore((s) => s.fetch);
  const upsertLocal = useConversationsStore((s) => s.upsertLocal);

  // Presencia en vivo: una suscripción WS por cada conversación DIRECT visible
  // (GROUP no tiene un único "otro usuario" del que trackear presencia).
  const directOtherUserIds = items.map((c) => c.otherUserId).filter((id): id is number => id != null);
  usePresenceSubscriptions(directOtherUserIds);

  // Racha en vivo: una suscripción WS + un GET inicial por cada conversación
  // DIRECT visible (GROUP no tiene racha).
  const directConversationIds = items.filter((c) => c.type === "DIRECT").map((c) => c.conversationId);
  useStreakSubscriptions(directConversationIds);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const openConversation = useCallback(
    (conv: ConversationResponse) => {
      setActiveConversation(conv);
      router.push(`/chat/${conv.conversationId}`);
    },
    [setActiveConversation, router],
  );

  const handleConversationReady = useCallback(
    (conv: ConversationResponse) => {
      upsertLocal(conv);
      openConversation(conv);
    },
    [upsertLocal, openConversation],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Avatar seed={user?.username ?? ""} label={user?.username ?? "?"} size={38} />
          <View>
            <Text style={[styles.username, { color: theme.text }]}>{user?.username}</Text>
            <Text style={[styles.role, { color: theme.textSecondary }]}>{user?.role}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setShowCreateGroup(true)} hitSlop={10}>
            <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: "600" }}>👥+</Text>
          </Pressable>
          {isAdmin && (
            <Pressable onPress={() => router.push("/admin")} hitSlop={10}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: "600" }}>🛠️</Text>
            </Pressable>
          )}
          <Pressable onPress={logout} hitSlop={10}>
            <Text style={{ color: theme.danger, fontSize: 13, fontWeight: "600" }}>Salir</Text>
          </Pressable>
        </View>
      </View>

      <UserSearchBar onConversationReady={handleConversationReady} />

      {error && <ErrorBanner message={error} onRetry={() => fetch()} />}

      {isLoading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.conversationId)}
          renderItem={({ item }) => <ConversationRow conversation={item} onPress={openConversation} />}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetch()} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>No tienes conversaciones aún</Text>
            </View>
          }
          contentContainerStyle={items.length === 0 && styles.emptyContainer}
        />
      )}

      <CreateGroupModal
        key={showCreateGroup ? "open" : "closed"}
        visible={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreated={handleConversationReady}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  username: {
    fontSize: 15,
    fontWeight: "700",
  },
  role: {
    fontSize: 11,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyContainer: {
    flexGrow: 1,
  },
});
