import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "@/hooks/use-theme";

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onRetry}
      disabled={!onRetry}
      style={[styles.wrapper, { backgroundColor: theme.dangerBackground }]}
    >
      <Text style={[styles.text, { color: theme.danger }]}>{message}</Text>
      {onRetry && <Text style={[styles.retry, { color: theme.danger }]}>Reintentar</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  text: {
    fontSize: 13,
  },
  retry: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
});
