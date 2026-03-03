const API_URL = import.meta.env.VITE_API_URL;

export interface PointDto {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePointPayload {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
}

interface ApiResponse<T> {
  data: T;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const pointsApi = {
  getAll(): Promise<ApiResponse<PointDto[]>> {
    return request('/points');
  },

  getById(id: number): Promise<ApiResponse<PointDto>> {
    return request(`/points/${id}`);
  },

  create(payload: CreatePointPayload): Promise<ApiResponse<PointDto>> {
    return request('/points', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: number, payload: Partial<CreatePointPayload>): Promise<ApiResponse<PointDto>> {
    return request(`/points/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  destroy(id: number): Promise<void> {
    return request(`/points/${id}`, { method: 'DELETE' });
  },
};
