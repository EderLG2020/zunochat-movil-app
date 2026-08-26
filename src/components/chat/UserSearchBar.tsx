import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/hooks/use-theme";
import { conversationService } from "@/services/conversation.service";
import { userService } from "@/services/user.service";
import type { ConversationResponse, UserSearchResult } from "@/types";

interface Props {
  onConversationReady: (conv: ConversationResponse) => void;
}

export function UserSearchBar({ onConversationReady }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    try {
      setIsSearching(true);
      const data = await userService.search(q.trim());
      setResults(data);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChangeText = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 350);
  };

  const handleSelect = async (user: UserSearchResult) => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    try {
      setCreatingId(user.id);
      const conv = await conversationService.create({ targetUserId: user.id });
      onConversationReady(conv);
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <View style={[styles.wrapper, { borderBottomColor: theme.border }]}>
      <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Buscar usuario..."
          placeholderTextColor={theme.placeholder}
          style={[styles.input, { color: theme.text }]}
        />
        {isSearching && <ActivityIndicator size="small" color={theme.primary} />}
      </View>

      {isOpen && (
        <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {results.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>Sin resultados</Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item)}
                  disabled={creatingId === item.id}
                  style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: theme.backgroundElement }]}
                >
                  <Avatar seed={item.id} label={item.username} size={32} />
                  <Text style={[styles.resultLabel, { color: theme.text }]}>{item.username}</Text>
                  {creatingId === item.id && <ActivityIndicator size="small" color={theme.primary} style={{ marginLeft: "auto" }} />}
                </Pressable>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 13,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  dropdown: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    maxHeight: 260,
    overflow: "hidden",
    zIndex: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  empty: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
