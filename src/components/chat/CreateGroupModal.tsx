import { useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/hooks/use-theme";
import { conversationService } from "@/services/conversation.service";
import { userService } from "@/services/user.service";
import type { ConversationResponse, UserSearchResult } from "@/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (conv: ConversationResponse) => void;
}

// El formulario arranca limpio en cada apertura porque el padre le pasa una
// `key` distinta al abrir (ver index.tsx) — remonta el componente entero en
// vez de resetear el estado a mano en un efecto.
export function CreateGroupModal({ visible, onClose, onCreated }: Props) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeQuery = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await userService.search(value.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const toggleMember = (user: UserSearchResult) => {
    setSelected((prev) => (prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user]));
  };

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Ponle un nombre al grupo");
      return;
    }
    if (selected.length < 2) {
      setError("Elige al menos 2 personas además de ti");
      return;
    }

    try {
      setIsCreating(true);
      const conv = await conversationService.createGroup({ name: name.trim(), memberIds: selected.map((u) => u.id) });
      onCreated(conv);
      onClose();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string; errors?: Record<string, string> } } })?.response?.data;
      setError(message?.errors?.memberIds ?? message?.message ?? "No se pudo crear el grupo");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Nuevo grupo</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Nombre del grupo</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Amigos del trabajo"
            placeholderTextColor={theme.placeholder}
            maxLength={100}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          />

          {selected.length > 0 && (
            <View style={styles.chipsRow}>
              {selected.map((u) => (
                <Pressable key={u.id} onPress={() => toggleMember(u)} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                  <Avatar seed={u.id} label={u.username} size={20} />
                  <Text style={[styles.chipText, { color: theme.text }]}>{u.username}</Text>
                  <Text style={{ color: theme.textSecondary }}>✕</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>Agregar personas</Text>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={handleChangeQuery}
              placeholder="Buscar usuario..."
              placeholderTextColor={theme.placeholder}
              style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            />
            {isSearching && <ActivityIndicator size="small" color={theme.primary} style={styles.searchSpinner} />}
          </View>

          {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          renderItem={({ item }) => {
            const isSelected = selected.some((u) => u.id === item.id);
            return (
              <Pressable
                onPress={() => toggleMember(item)}
                style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: theme.backgroundElement }]}
              >
                <Avatar seed={item.id} label={item.username} size={32} />
                <Text style={[styles.resultLabel, { color: theme.text }]}>{item.username}</Text>
                {isSelected && <Text style={{ color: theme.primary, fontWeight: "700" }}>✓</Text>}
              </Pressable>
            );
          }}
        />

        <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
          <Pressable
            onPress={handleCreate}
            disabled={isCreating}
            style={[styles.createButton, { backgroundColor: theme.primary, opacity: isCreating ? 0.6 : 1 }]}
          >
            {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Crear grupo</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  closeIcon: {
    fontSize: 16,
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchSpinner: {
    marginLeft: -32,
  },
  errorText: {
    fontSize: 12,
    marginTop: 10,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
    paddingBottom: 28,
  },
  createButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
