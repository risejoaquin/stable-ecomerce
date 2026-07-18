let getAuthToken: (() => Promise<string | null>) | null = null;

export const setAuthTokenGetter = (getter: () => Promise<string | null>) => {
  getAuthToken = getter;
};

// Obtenemos la URL base de forma dinámica
const getBaseUrl = () => {
  // 1. Priorizamos la variable de entorno de Vite
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 2. Fallback dinámico para evitar rutas relativas que caigan en el catch-all del servidor estático
  if (typeof window !== 'undefined') {
    // Puedes personalizar la lógica de dominio aquí. 
    // Por ejemplo, si tu frontend es 'app.midominio.com', el backend podría ser 'api.midominio.com'
    // const hostname = window.location.hostname;
    // return `https://api.${hostname.replace('app.', '')}/api`;

    // Por defecto, apuntamos al mismo origen de forma absoluta para evitar el ruteo relativo del frontend
    return `${window.location.origin}/api`;
  }
  
  // Fallback seguro por defecto si no hay contexto de window
  return '/api';
};

const BASE_URL = getBaseUrl();

const getHeaders = async () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

export const apiClient = {
  get: async (url: string) => {
    // Aseguramos que url empiece con / para que se concatene correctamente si BASE_URL no termina en /
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    const res = await fetch(`${BASE_URL}${normalizedUrl}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  
  post: async (url: string, data: any) => {
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    const res = await fetch(`${BASE_URL}${normalizedUrl}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  
  put: async (url: string, data: any) => {
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    const res = await fetch(`${BASE_URL}${normalizedUrl}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  
  delete: async (url: string) => {
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    const res = await fetch(`${BASE_URL}${normalizedUrl}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }
};
