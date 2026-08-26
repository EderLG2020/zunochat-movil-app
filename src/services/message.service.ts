import { apiClient } from "@/services/api.config";
import type { ApiResponse, EditMessageRequest, MarkReadRequest, MessageCursorPage, MessageResponse, SendMessageRequest } from "@/types";

export const messageService = {
  // GET /api/messages?conversationId=&beforeId=&size=
  // Paginación por cursor: sin beforeId trae los más recientes; con beforeId,
  // los `size` mensajes anteriores a ese id. Vienen más reciente primero.
  list: async (conversationId: number, beforeId?: number | null, size = 30): Promise<MessageCursorPage> => {
    const res = await apiClient.get<ApiResponse<MessageCursorPage>>("/api/messages", {
      params: { conversationId, beforeId: beforeId ?? undefined, size },
    });
    return res.data.data;
  },

  // POST /api/messages — el receptor se infiere desde la conversación
  send: async (payload: SendMessageRequest): Promise<MessageResponse> => {
    const res = await apiClient.post<ApiResponse<MessageResponse>>("/api/messages", payload);
    return res.data.data;
  },

  // PATCH /api/messages/read
  markRead: async (payload: MarkReadRequest): Promise<string> => {
    const res = await apiClient.patch<ApiResponse<string>>("/api/messages/read", payload);
    return res.data.data;
  },

  // PATCH /api/messages/{id} — solo texto, solo el emisor; el backend valida la ventana de 15 min
  edit: async (messageId: number, payload: EditMessageRequest): Promise<MessageResponse> => {
    const res = await apiClient.patch<ApiResponse<MessageResponse>>(`/api/messages/${messageId}`, payload);
    return res.data.data;
  },

  // DELETE /api/messages/{id} — soft delete, solo el emisor
  delete: async (messageId: number): Promise<MessageResponse> => {
    const res = await apiClient.delete<ApiResponse<MessageResponse>>(`/api/messages/${messageId}`);
    return res.data.data;
  },
};
