import { useAuthSafe as useAuth } from '../hooks/useAuthSafe';
import { useCallback } from "react";

// Obtenemos la URL base de forma dinámica
const getBaseUrl = () => {
  // 1. Priorizamos la variable de entorno de Vite
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 2. Fallback dinámico para evitar rutas relativas que caigan en el catch-all del servidor estático
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  
  // Fallback seguro por defecto si no hay contexto de window
  return '/api';
};

const API_URL = getBaseUrl();

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
      
      // Aseguramos que el path empiece con /
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      
      const res = await fetch(`${API_URL}${normalizedPath}`, { ...options, headers });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(error.error || "Error en la petición");
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
