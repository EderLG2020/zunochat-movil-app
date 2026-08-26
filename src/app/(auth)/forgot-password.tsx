import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useTheme } from "@/hooks/use-theme";
import { authService } from "@/services";

type Step = "request" | "reset" | "done";

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? fallback;
}

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequest = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await authService.forgotPassword({ email: email.trim() });
      setStep("reset");
    } catch (err) {
      setError(extractMessage(err, "No se pudo procesar la solicitud."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await authService.resetPassword({ email: email.trim(), otpCode: otpCode.trim(), newPassword });
      setStep("done");
    } catch (err) {
      setError(extractMessage(err, "Código incorrecto o expirado."));
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
              {step === "request" && "Recupera tu contraseña"}
              {step === "reset" && "Crea una nueva contraseña"}
              {step === "done" && "¡Listo!"}
            </Text>
          </View>

          {step === "request" && (
            <View style={styles.form}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                Ingresa el correo de tu cuenta y te enviaremos un código para restablecer tu contraseña.
              </Text>
              <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              {error && (
                <View style={[styles.errorBox, { backgroundColor: theme.dangerBackground }]}>
                  <Text style={{ color: theme.danger, fontSize: 13 }}>{error}</Text>
                </View>
              )}
              <Button title="Enviar código" onPress={handleRequest} isLoading={isLoading} style={{ marginTop: 8 }} />
            </View>
          )}

          {step === "reset" && (
            <View style={styles.form}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center" }}>
                Si <Text style={{ fontWeight: "700", color: theme.text }}>{email}</Text> pertenece a una cuenta activa, te llegó un código de 6 dígitos.
              </Text>
              <TextField label="Código OTP" value={otpCode} onChangeText={setOtpCode} placeholder="123456" keyboardType="number-pad" maxLength={6} />
              <TextField label="Nueva contraseña" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" />
              {error && (
                <View style={[styles.errorBox, { backgroundColor: theme.dangerBackground }]}>
                  <Text style={{ color: theme.danger, fontSize: 13 }}>{error}</Text>
                </View>
              )}
              <Button title="Restablecer contraseña" onPress={handleReset} isLoading={isLoading} />
              <Button title="Volver" variant="ghost" onPress={() => setStep("request")} />
            </View>
          )}

          {step === "done" && (
            <View style={styles.form}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center" }}>
                Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </Text>
              <Button title="Ir a iniciar sesión" onPress={() => router.replace("/(auth)/login")} />
            </View>
          )}

          {step !== "done" && (
            <View style={styles.footer}>
              <Link href="/(auth)/login" replace>
                <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "600" }}>Volver a iniciar sesión</Text>
              </Link>
            </View>
          )}
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
