import { apiClient } from "@/services/api.config";
import type {
  ApiResponse,
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendOtpRequest,
  ResetPasswordRequest,
  VerifyOtpRequest,
} from "@/types";

export const authService = {
  // POST /api/auth/login — identifier puede ser username o email
  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>("/api/auth/login", payload);
    return res.data.data;
  },

  // POST /api/auth/register — retorna el OTP (perfil dev) o confirmación
  register: async (payload: RegisterRequest): Promise<string> => {
    const res = await apiClient.post<ApiResponse<string>>("/api/auth/register", payload);
    return res.data.data;
  },

  // POST /api/auth/verify-otp — activa la cuenta y devuelve JWT igual que login
  verifyOtp: async (payload: VerifyOtpRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>("/api/auth/verify-otp", payload);
    return res.data.data;
  },

  // POST /api/auth/resend-otp — para cuentas PENDING_VERIFICATION que no alcanzaron a verificar
  resendOtp: async (payload: ResendOtpRequest): Promise<void> => {
    await apiClient.post<ApiResponse<null>>("/api/auth/resend-otp", payload);
  },

  // POST /api/auth/forgot-password — respuesta genérica exista o no la cuenta
  forgotPassword: async (payload: ForgotPasswordRequest): Promise<void> => {
    await apiClient.post<ApiResponse<null>>("/api/auth/forgot-password", payload);
  },

  // POST /api/auth/reset-password
  resetPassword: async (payload: ResetPasswordRequest): Promise<void> => {
    await apiClient.post<ApiResponse<null>>("/api/auth/reset-password", payload);
  },

  // POST /api/auth/refresh — renueva el JWT antes/poco después de que expire
  refresh: async (currentToken: string): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>("/api/auth/refresh", null, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    return res.data.data;
  },
};
