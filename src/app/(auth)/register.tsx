import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useTheme } from "@/hooks/use-theme";
import { authService } from "@/services";
import { useAuthStore } from "@/store/authStore";

type Step = "register" | "verify-otp";
const RESEND_COOLDOWN_SECONDS = 60;

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string; code?: string };
  if (e?.response?.data?.message) return e.response.data.message;
  // TEMPORAL — diagnóstico de conectividad, ver login.tsx. Quitar una vez resuelto.
  return `${fallback} [DEBUG: code=${e?.code ?? "?"} msg=${e?.message ?? "?"}]`;
}

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [step, setStep] = useState<Step>("register");
  const [dni, setDni] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1_000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    try {
      setIsResending(true);
      setError(null);
      await authService.resendOtp({ email: email.trim() });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(extractMessage(err, "No se pudo reenviar el código."));
    } finally {
      setIsResending(false);
    }
  };

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await authService.register({ dni: dni.trim(), username: username.trim(), email: email.trim(), password });
      setStep("verify-otp");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(extractMessage(err, "Error al registrar."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const auth = await authService.verifyOtp({ email: email.trim(), otpCode: otpCode.trim() });
      login(auth);
      router.replace("/(app)");
    } catch (err) {
      setError(extractMessage(err, "OTP incorrecto o expirado."));
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
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {step === "register" ? "Crea tu cuenta" : "Verifica tu email"}
            </Text>
          </View>

          {step === "register" ? (
            <View style={styles.form}>
              <TextField label="DNI" value={dni} onChangeText={setDni} keyboardType="number-pad" maxLength={8} />
              <TextField label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" />
              <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
              {error && (
                <View style={[styles.errorBox, { backgroundColor: theme.dangerBackground }]}>
                  <Text style={{ color: theme.danger, fontSize: 13 }}>{error}</Text>
                </View>
              )}
              <Button title="Registrarme" onPress={handleRegister} isLoading={isLoading} style={{ marginTop: 8 }} />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center" }}>
                Ingresa el código enviado a <Text style={{ fontWeight: "700", color: theme.text }}>{email}</Text>
              </Text>
              <TextField
                label="Código OTP"
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
              />
              {error && (
                <View style={[styles.errorBox, { backgroundColor: theme.dangerBackground }]}>
                  <Text style={{ color: theme.danger, fontSize: 13 }}>{error}</Text>
                </View>
              )}
              <Button title="Verificar" onPress={handleVerifyOtp} isLoading={isLoading} />
              <Button
                title={resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : "Reenviar código"}
                variant="ghost"
                isLoading={isResending}
                disabled={resendCooldown > 0}
                onPress={handleResendOtp}
              />
              <Button
                title="Volver"
                variant="ghost"
                onPress={() => {
                  setStep("register");
                  setError(null);
                }}
              />
            </View>
          )}

          <View style={styles.footer}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>¿Ya tienes cuenta? </Text>
            <Link href="/(auth)/login" replace>
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "600" }}>Inicia sesión</Text>
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
    gap: 24,
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
    gap: 14,
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
});
