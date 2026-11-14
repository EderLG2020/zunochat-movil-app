import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { StreakRequestBanner } from "@/components/chat/StreakRequestBanner";
import { useTheme } from "@/hooks/use-theme";
import { useStreak } from "@/hooks/useStreaks";
import { conversationService } from "@/services/conversation.service";
import { streakService } from "@/services/streak.service";
import { userService } from "@/services/user.service";
import { useStreakStore } from "@/store/streakStore";
import type { ConversationResponse, UserProfileResponse } from "@/types";

interface Props {
  visible: boolean;
  conversation: ConversationResponse | null;
  currentUserId: number;
  onClose: () => void;
  onConversationUpdated: (conv: ConversationResponse) => void;
}

/**
 * Perfil del contacto — solo tiene sentido para DIRECT: en GROUP no hay un
 * único "otro usuario" del que mostrar perfil (ver chat/[id].tsx).
 */
export function ContactProfileSheet({ visible, conversation, currentUserId, onClose, onConversationUpdated }: Props) {
  const theme = useTheme();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingEphemeral, setIsTogglingEphemeral] = useState(false);
  const [isTogglingStreak, setIsTogglingStreak] = useState(false);
  const streak = useStreak(conversation?.conversationId);
  const setStreakInStore = useStreakStore((s) => s.setStreak);

  useEffect(() => {
    if (!visible || conversation?.otherUserId == null) return;
    let cancelled = false;
    userService
      .getProfile(conversation.otherUserId)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("No se pudo cargar el perfil");
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, conversation?.otherUserId]);

  if (!conversation) return null;

  const toggleEphemeral = async () => {
    setIsTogglingEphemeral(true);
    try {
      const updated = await conversationService.setEphemeral(conversation.conversationId, {
        enabled: !conversation.ephemeralEnabled,
      });
      onConversationUpdated(updated);
    } finally {
      setIsTogglingEphemeral(false);
    }
  };

  // Activar dispara una solicitud (opt-in mutuo, ver StreakRequestBanner) —
  // no queda enabled=true hasta que el otro confirme. Desactivar sí es
  // inmediato, sin necesidad de que el otro confirme nada.
  const toggleStreak = async () => {
    setIsTogglingStreak(true);
    try {
      const updated = await streakService.setEnabled(conversation.conversationId, {
        enabled: !(streak?.enabled ?? false),
      });
      setStreakInStore(updated);
    } finally {
      setIsTogglingStreak(false);
    }
  };

  const refreshStreak = () => {
    streakService.get(conversation.conversationId).then(setStreakInStore);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.backButton}>
            <Text style={[styles.backIcon, { color: theme.text }]}>‹</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Datos del contacto</Text>
        </View>

        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} />
          </View>
        )}

        {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

        {!isLoading && !error && profile && (
          <View style={styles.content}>
            <View style={styles.profileHeader}>
              <Avatar seed={profile.id} label={profile.username} size={72} />
              <Text style={[styles.username, { color: theme.text }]}>{profile.username}</Text>
            </View>

            <View style={[styles.section, styles.rowBetween, { borderTopColor: theme.border }]}>
              <View style={styles.flexShrink}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Chat temporal</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                  Los mensajes nuevos se autoeliminan 24 horas después de enviarse.
                </Text>
              </View>
              {isTogglingEphemeral ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Switch value={conversation.ephemeralEnabled} onValueChange={toggleEphemeral} />
              )}
            </View>

            <View style={[styles.section, { borderTopColor: theme.border }]}>
              {streak?.requestStatus === "PENDING" ? (
                <View>
                  <Text style={[styles.rowTitle, { color: theme.text, marginBottom: 10 }]}>Racha 🔥</Text>
                  <StreakRequestBanner
                    conversationId={conversation.conversationId}
                    streak={streak}
                    currentUserId={currentUserId}
                    onResolved={refreshStreak}
                  />
                </View>
              ) : (
                <View style={styles.rowBetween}>
                  <View style={styles.flexShrink}>
                    <Text style={[styles.rowTitle, { color: theme.text }]}>Racha 🔥</Text>
                    <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                      {streak?.enabled
                        ? `Llevan ${streak.currentCount} día${streak.currentCount === 1 ? "" : "s"} seguidos escribiéndose.`
                        : "Cuenta los días seguidos en que ambos se escriben. El otro debe confirmar para empezar."}
                    </Text>
                  </View>
                  {isTogglingStreak ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <Switch value={streak?.enabled ?? false} onValueChange={toggleStreak} />
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 12,
    paddingTop: 52,
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
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
  },
  username: {
    fontSize: 17,
    fontWeight: "700",
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  flexShrink: {
    flexShrink: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
});
