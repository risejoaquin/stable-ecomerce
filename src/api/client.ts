const BASE_URL = import.meta.env.VITE_API_URL || '/api';

let getAuthToken: (() => Promise<string | null>) | null = null;

export const setAuthTokenGetter = (getter: () => Promise<string | null>) => {
  getAuthToken = getter;
};

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
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  post: async (url: string, data: any) => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  put: async (url: string, data: any) => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  delete: async (url: string) => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }
};
