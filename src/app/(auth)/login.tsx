import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useTheme } from "@/hooks/use-theme";
import { authService } from "@/services";
import { useAuthStore } from "@/store/authStore";

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? fallback;
}

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!identifier.trim() || !password.trim()) return;
    try {
      setIsLoading(true);
      setError(null);
      const auth = await authService.login({ identifier: identifier.trim(), password });
      login(auth);
      router.replace("/(app)");
    } catch (err) {
      setError(extractMessage(err, "Credenciales incorrectas."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>ZunoChat</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Inicia sesión para continuar</Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="Usuario o email"
              placeholder="username o correo@ejemplo.com"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoComplete="username"
              returnKeyType="next"
            />
            <TextField
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "600" }}>¿Olvidaste tu contraseña?</Text>
            </Link>
            {error && (
              <View style={[styles.errorBox, { backgroundColor: theme.dangerBackground }]}>
                <Text style={{ color: theme.danger, fontSize: 13 }}>{error}</Text>
              </View>
            )}
            <Button title="Entrar" onPress={handleSubmit} isLoading={isLoading} style={{ marginTop: 8 }} />
          </View>

          <View style={styles.footer}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>¿No tienes cuenta? </Text>
            <Link href="/(auth)/register" replace>
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "600" }}>Regístrate</Text>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 28,
  },
  header: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  errorBox: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -8,
  },
});
