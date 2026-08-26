import { apiClient } from "@/services/api.config";
import type { ApiResponse } from "@/types";

interface UploadResponse {
  urls: string[];
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

export const uploadService = {
  // POST /api/uploads (multipart) — hasta 3 archivos, 5MB c/u (límites del backend).
  // React Native no acepta un Blob/File del DOM en FormData — cada parte va como
  // { uri, name, type }, que el runtime nativo resuelve leyendo el archivo del uri.
  upload: async (files: PickedFile[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob);
    });

    const res = await apiClient.post<ApiResponse<UploadResponse>>("/api/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data.urls;
  },
};
