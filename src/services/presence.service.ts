import { apiClient } from "@/services/api.config";
import type { ApiResponse, PresenceSnapshotResponse } from "@/types";

export const presenceService = {
  // GET /api/presence?ids=1,2,3 — estado actual de presencia, para "sembrar" el
  // store al abrir la app. El WS (/topic/presence.{userId}) solo avisa CAMBIOS
  // a quien ya esté suscripto en el momento en que ocurren — sin este snapshot,
  // alguien que se conectó antes de que la app abriera nunca aparece "en línea"
  // hasta el próximo cambio de estado.
  snapshot: async (ids: number[]): Promise<PresenceSnapshotResponse[]> => {
    if (ids.length === 0) return [];
    const res = await apiClient.get<ApiResponse<PresenceSnapshotResponse[]>>("/api/presence", {
      params: { ids: ids.join(",") },
    });
    return res.data.data;
  },
};
