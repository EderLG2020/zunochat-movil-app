import { memo, useState } from "react";
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";

import { useTheme } from "@/hooks/use-theme";
import { timeLabel } from "@/lib/format";
import { messageService } from "@/services";
import { useChatStore } from "@/store/chatStore";
import type { MessageResponse } from "@/types";

function StatusTicks({ status, color, colorRead }: { status: MessageResponse["status"]; color: string; colorRead: string }) {
  if (status === "READ") return <Text style={[styles.ticks, { color: colorRead }]}>✓✓</Text>;
  if (status === "DELIVERED") return <Text style={[styles.ticks, { color }]}>✓✓</Text>;
  return <Text style={[styles.ticks, { color }]}>✓</Text>;
}

interface Props {
  message: MessageResponse;
  currentUserId: number;
  isGroupStart?: boolean;
}

export const MessageBubble = memo(function MessageBubble({ message, currentUserId, isGroupStart = true }: Props) {
  const theme = useTheme();
  const updateMessage = useChatStore((s) => s.updateMessage);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.textContent ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const isMine = message.senderId === currentUserId;
  const time = timeLabel(message.sentAt);

  // La ventana de 15 min para editar la valida el backend (MSG_EDIT_WINDOW_EXPIRED).
  const canEdit = isMine && !message.deleted && message.type === "TEXT";
  const canDelete = isMine && !message.deleted;

  const bubbleColor = isMine ? theme.bubbleMine : theme.bubbleTheirs;
  const textColor = isMine ? theme.bubbleMineText : theme.bubbleTheirsText;
  const metaColor = isMine ? "rgba(255,255,255,0.75)" : theme.textSecondary;

  const handleDelete = () => {
    setActionsOpen(false);
    Alert.alert("Eliminar mensaje", "¿Eliminar este mensaje?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          const updated = await messageService.delete(message.messageId);
          updateMessage(updated);
        },
      },
    ]);
  };

  const handleSaveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.textContent) {
      setIsEditing(false);
      return;
    }
    try {
      setIsSaving(true);
      setEditError(null);
      const updated = await messageService.edit(message.messageId, { textContent: trimmed });
      updateMessage(updated);
      setIsEditing(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setEditError(e.response?.data?.message ?? "No se pudo editar el mensaje.");
    } finally {
      setIsSaving(false);
    }
  };

  if (message.deleted) {
    return (
      <View style={[styles.row, { justifyContent: isMine ? "flex-end" : "flex-start" }, isGroupStart && styles.groupSpacing]}>
        <View style={[styles.tombstone, { borderColor: theme.border }]}>
          <Text style={{ fontSize: 12, fontStyle: "italic", color: theme.textSecondary }}>🚫 Mensaje eliminado</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, { justifyContent: isMine ? "flex-end" : "flex-start" }, isGroupStart && styles.groupSpacing]}>
      <Pressable
        onLongPress={() => (canEdit || canDelete) && setActionsOpen(true)}
        style={[
          styles.bubble,
          { backgroundColor: bubbleColor },
          isMine ? styles.bubbleMineShape : styles.bubbleTheirsShape,
          !isMine && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
        ]}
      >
        {isEditing ? (
          <View style={{ gap: 6 }}>
            <TextInput
              autoFocus
              value={editText}
              onChangeText={setEditText}
              multiline
              style={[styles.editInput, { color: textColor }]}
            />
            {editError && <Text style={{ fontSize: 11, color: "#FCA5A5" }}>{editError}</Text>}
            <View style={styles.editActions}>
              <Pressable onPress={() => setIsEditing(false)}>
                <Text style={{ fontSize: 11, color: textColor, opacity: 0.85 }}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSaveEdit} disabled={isSaving}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: textColor, opacity: isSaving ? 0.5 : 0.85 }}>
                  {isSaving ? "Guardando…" : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {message.type === "TEXT" && <Text style={[styles.text, { color: textColor }]}>{message.textContent}</Text>}

            {message.type === "FILE" && message.fileUrls?.length > 0 && (
              <View style={{ gap: 4 }}>
                {message.fileUrls.map((url, i) => (
                  <Pressable key={i} onPress={() => Linking.openURL(url)}>
                    <Text style={[styles.link, { color: textColor, textDecorationLine: "underline" }]}>📎 Archivo {i + 1}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {message.type === "IMAGE" && message.fileUrls?.length > 0 && (
              <View style={styles.imageGrid}>
                {message.fileUrls.map((url, i) => (
                  <Pressable key={i} onPress={() => Linking.openURL(url)}>
                    <Image source={{ uri: url }} style={styles.image} contentFit="cover" transition={150} />
                  </Pressable>
                ))}
              </View>
            )}

            {message.type === "PAYLOAD" && (
              <Text style={[styles.payload, { color: metaColor }]}>{JSON.stringify(message.payload, null, 2)}</Text>
            )}
          </>
        )}

        <View style={styles.metaRow}>
          {message.editedAt && <Text style={[styles.edited, { color: metaColor }]}>editado</Text>}
          <Text style={[styles.time, { color: metaColor }]}>{time}</Text>
          {isMine && <StatusTicks status={message.status} color={metaColor} colorRead="#93C5FD" />}
        </View>
      </Pressable>

      <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={() => setActionsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActionsOpen(false)}>
          <View style={[styles.actionSheet, { backgroundColor: theme.card }]}>
            {canEdit && (
              <Pressable
                onPress={() => { setActionsOpen(false); setEditError(null); setIsEditing(true); }}
                style={[styles.actionRow, { borderBottomColor: theme.border }]}
              >
                <Text style={{ fontSize: 14, color: theme.text }}>✏️ Editar</Text>
              </Pressable>
            )}
            {canDelete && (
              <Pressable onPress={handleDelete} style={styles.actionRow}>
                <Text style={{ fontSize: 14, color: theme.danger }}>🗑️ Eliminar</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginTop: 1,
    marginBottom: 1,
    paddingHorizontal: 12,
  },
  groupSpacing: {
    marginTop: 10,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tombstone: {
    maxWidth: "78%",
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMineShape: {
    borderTopRightRadius: 4,
  },
  bubbleTheirsShape: {
    borderTopLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  editInput: {
    fontSize: 15,
    lineHeight: 20,
    minHeight: 40,
    padding: 0,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 14,
  },
  link: {
    fontSize: 14,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  image: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  payload: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  edited: {
    fontSize: 10,
    fontStyle: "italic",
  },
  time: {
    fontSize: 10,
  },
  ticks: {
    fontSize: 11,
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
});
