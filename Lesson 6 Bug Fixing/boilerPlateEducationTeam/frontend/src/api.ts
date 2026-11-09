// Base URL of the backend. Set VITE_API_URL in .env (local) or in Vercel settings (deployed).
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type Example = {
  id: number;
  title: string;
  created_at: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export function getExamples() {
  return request<Example[]>('/api/example');
}

export function createExample(title: string) {
  return request<Example>('/api/example', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}
