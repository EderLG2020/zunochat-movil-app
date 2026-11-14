import { StyleSheet, Text } from "react-native";

import { useStreak } from "@/hooks/useStreaks";

interface Props {
  conversationId: number;
}

/**
 * 🔥 + contador de racha junto al nombre del chat. No se muestra hasta que
 * la racha esté activa y tenga al menos 1 día contado (INACTIVE/enabled=false
 * no renderiza nada — evita ruido visual en conversaciones sin racha).
 * Ámbar cuando AT_RISK, para avisar que se pierde si no escriben hoy.
 */
export function StreakBadge({ conversationId }: Props) {
  const streak = useStreak(conversationId);

  if (!streak || !streak.enabled || streak.currentCount <= 0) return null;

  const isAtRisk = streak.status === "AT_RISK";

  return (
    <Text style={[styles.badge, { color: isAtRisk ? "#F59E0B" : "#F97316" }]}>🔥{streak.currentCount}</Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 12,
    fontWeight: "700",
  },
});
