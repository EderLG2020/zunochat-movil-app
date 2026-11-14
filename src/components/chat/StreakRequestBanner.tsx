import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { streakService } from "@/services/streak.service";
import type { StreakInfo } from "@/store/streakStore";

interface Props {
  conversationId: number;
  streak: StreakInfo;
  currentUserId: number;
  onResolved: () => void;
}

/**
 * Solicitud de racha pendiente, mostrada dentro del panel de datos del
 * contacto. Si la mandó el usuario autenticado, solo informa que está
 * esperando confirmación; si la mandó el otro, ofrece Aceptar/Rechazar.
 */
export function StreakRequestBanner({ conversationId, streak, currentUserId, onResolved }: Props) {
  const [isResponding, setIsResponding] = useState(false);
  const iSentIt = streak.requestedByUserId === currentUserId;

  const respond = async (accept: boolean) => {
    setIsResponding(true);
    try {
      await streakService.respond(conversationId, { accept });
      onResolved();
    } finally {
      setIsResponding(false);
    }
  };

  if (iSentIt) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.text}>🔥 Le pediste activar la racha — esperando que confirme.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, styles.rowBetween]}>
      <Text style={[styles.text, { flex: 1 }]}>🔥 Te invitó a llevar una racha juntos</Text>
      {isResponding ? (
        <ActivityIndicator size="small" color="#F97316" />
      ) : (
        <View style={styles.actions}>
          <Pressable onPress={() => respond(true)} style={styles.acceptButton}>
            <Text style={styles.acceptText}>Aceptar</Text>
          </Pressable>
          <Pressable onPress={() => respond(false)} style={styles.declineButton}>
            <Text style={styles.declineText}>Rechazar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "rgba(249,115,22,0.12)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 13,
    color: "#C2410C",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    backgroundColor: "#F97316",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  acceptText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  declineButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  declineText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C2410C",
  },
});
