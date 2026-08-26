import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { useTheme } from "@/hooks/use-theme";
import { useTypingIndicator } from "@/hooks/useWebSocket";
import { messageService, uploadService } from "@/services";
import { useChatStore } from "@/store/chatStore";

interface Props {
  conversationId: number;
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

const MAX_FILES = 3;

export function MessageInput({ conversationId, onSend, disabled = false }: Props) {
  const theme = useTheme();
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const { sendTyping } = useTypingIndicator(conversationId);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    try {
      setIsSending(true);
      await onSend(trimmed);
      setText("");
    } finally {
      setIsSending(false);
    }
  };

  const handleChangeText = (value: string) => {
    setText(value);
    if (value.trim()) sendTyping();
  };

  const handleAttach = async () => {
    setAttachError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAttachError("Necesitas dar permiso de acceso a tus fotos para adjuntar imágenes.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_FILES,
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return;

    try {
      setIsAttaching(true);
      const picked = result.assets.map((asset, i) => ({
        uri: asset.uri,
        name: asset.fileName ?? `imagen-${i}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      }));
      const urls = await uploadService.upload(picked);
      const msg = await messageService.send({ conversationId, type: "IMAGE", fileUrls: urls });
      appendMessage(msg);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setAttachError(e.response?.data?.message ?? "No se pudo adjuntar la imagen.");
    } finally {
      setIsAttaching(false);
    }
  };

  const canSend = !!text.trim() && !isSending && !disabled;

  return (
    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border, backgroundColor: theme.card }}>
      {attachError && (
        <Text style={[styles.attachError, { color: theme.danger }]}>{attachError}</Text>
      )}
      <View style={styles.wrapper}>
        <Pressable
          onPress={handleAttach}
          disabled={disabled || isAttaching}
          style={[styles.attachButton, { opacity: disabled || isAttaching ? 0.5 : 1 }]}
        >
          {isAttaching ? <ActivityIndicator size="small" color={theme.textSecondary} /> : <Text style={{ fontSize: 20 }}>📎</Text>}
        </Pressable>

        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={handleChangeText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={theme.placeholder}
          editable={!disabled}
          multiline
          style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, { backgroundColor: canSend ? theme.primary : theme.border }]}
        >
          {isSending ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.sendIcon}>➤</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attachError: {
    fontSize: 11,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  attachButton: {
    width: 36,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: {
    color: "#ffffff",
    fontSize: 16,
  },
});
