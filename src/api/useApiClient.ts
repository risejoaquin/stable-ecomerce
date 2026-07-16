import { useAuthSafe as useAuth } from '../hooks/useAuthSafe';
;
import { useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export function useApiClient() {
  const { getToken } = useAuth();

  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = await getToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...options.headers,
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      let res;
      try {
        res = await fetch(`${API_URL}${path}`, { ...options, headers });
      } catch (err: any) {
        throw new Error(err.message === 'Failed to fetch' ? 'Error de red o CORS. El servidor no está respondiendo adecuadamente.' : err.message);
      }
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: `Error HTTP ${res.status}` }));
        throw new Error(error.error || error.message || "Error en la petición");
      }
      return res.json();
    },
    [getToken]
  );

  return {
    get: (url: string) => apiFetch(url),
    post: (url: string, data: any) => apiFetch(url, { method: 'POST', body: JSON.stringify(data) }),
    put: (url: string, data: any) => apiFetch(url, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (url: string) => apiFetch(url, { method: 'DELETE' })
  };
}
