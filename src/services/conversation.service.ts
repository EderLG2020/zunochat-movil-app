import { apiClient } from "@/services/api.config";
import type { ApiResponse, ConversationResponse, CreateConversationRequest, MuteConversationRequest, Page } from "@/types";

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

  // PATCH /api/conversations/{id}/mute
  setMuted: async (conversationId: number, payload: MuteConversationRequest): Promise<ConversationResponse> => {
    const res = await apiClient.patch<ApiResponse<ConversationResponse>>(`/api/conversations/${conversationId}/mute`, payload);
    return res.data.data;
  },
};
