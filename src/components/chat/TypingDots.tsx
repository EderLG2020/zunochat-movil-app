import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

function Dot({ delay, color }: { delay: number; color: string }) {
  const [value] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
      ]}
    />
  );
}

export function TypingDots() {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Dot delay={0} color={theme.textSecondary} />
      <Dot delay={120} color={theme.textSecondary} />
      <Dot delay={240} color={theme.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
