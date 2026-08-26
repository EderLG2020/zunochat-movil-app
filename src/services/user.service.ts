import { apiClient } from "@/services/api.config";
import type { ApiResponse, BlockedUserResponse, UserSearchResult } from "@/types";

export const userService = {
  // GET /api/users/search?q=
  search: async (q: string): Promise<UserSearchResult[]> => {
    const res = await apiClient.get<ApiResponse<UserSearchResult[]>>("/api/users/search", {
      params: { q },
    });
    return res.data.data;
  },

  // POST /api/users/{id}/block
  block: async (userId: number): Promise<void> => {
    await apiClient.post<ApiResponse<null>>(`/api/users/${userId}/block`);
  },

  // DELETE /api/users/{id}/block
  unblock: async (userId: number): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>(`/api/users/${userId}/block`);
  },

  // GET /api/users/blocked
  listBlocked: async (): Promise<BlockedUserResponse[]> => {
    const res = await apiClient.get<ApiResponse<BlockedUserResponse[]>>("/api/users/blocked");
    return res.data.data;
  },
};
