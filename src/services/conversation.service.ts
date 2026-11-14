import { apiClient } from "@/services/api.config";
import type {
  ApiResponse,
  ConversationResponse,
  CreateConversationRequest,
  CreateGroupRequest,
  MuteConversationRequest,
  Page,
  SetEphemeralRequest,
} from "@/types";

export const conversationService = {
  // GET /api/conversations?page=0&size=20 — el userId se extrae del JWT
  list: async (page = 0, size = 20): Promise<Page<ConversationResponse>> => {
    const res = await apiClient.get<ApiResponse<Page<ConversationResponse>>>("/api/conversations", {
      params: { page, size },
    });
    return res.data.data;
  },

  // POST /api/conversations — si ya existe, la retorna sin duplicar
  create: async (payload: CreateConversationRequest): Promise<ConversationResponse> => {
    const res = await apiClient.post<ApiResponse<ConversationResponse>>("/api/conversations", payload);
    return res.data.data;
  },

  // POST /api/conversations/group — memberIds no incluye al creador
  createGroup: async (payload: CreateGroupRequest): Promise<ConversationResponse> => {
    const res = await apiClient.post<ApiResponse<ConversationResponse>>("/api/conversations/group", payload);
    return res.data.data;
  },

  // PATCH /api/conversations/{id}/mute
  setMuted: async (conversationId: number, payload: MuteConversationRequest): Promise<ConversationResponse> => {
    const res = await apiClient.patch<ApiResponse<ConversationResponse>>(`/api/conversations/${conversationId}/mute`, payload);
    return res.data.data;
  },

  // PATCH /api/conversations/{id}/ephemeral — afecta a la conversación entera, no solo a quien lo activa
  setEphemeral: async (conversationId: number, payload: SetEphemeralRequest): Promise<ConversationResponse> => {
    const res = await apiClient.patch<ApiResponse<ConversationResponse>>(`/api/conversations/${conversationId}/ephemeral`, payload);
    return res.data.data;
  },
};
