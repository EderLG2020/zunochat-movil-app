import { StyleSheet, Text, View } from "react-native";

import { avatarColor } from "@/lib/format";

interface Props {
  seed: number | string;
  label: string;
  size?: number;
  online?: boolean;
}

export function Avatar({ seed, label, size = 44, online }: Props) {
  const backgroundColor = avatarColor(seed);
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
        <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{(label || "?").charAt(0).toUpperCase()}</Text>
      </View>
      {online && <View style={[styles.badge, { width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    color: "#ffffff",
    fontWeight: "700",
  },
  badge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});
