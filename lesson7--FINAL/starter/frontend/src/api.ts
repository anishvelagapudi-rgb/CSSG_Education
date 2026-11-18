import { supabase } from './supabase'

// Base URL of the backend. Set VITE_API_URL in .env (local) or in Vercel settings (deployed).
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type Example = {
  id: number;
  title: string;
  created_at: string;
};

export type Note = {
  id: number;
  user_id: string;
  body: string;
  is_public: boolean;
  created_at: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // The logged-in user's token. supabase-js refreshes it for you before it expires.
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // This header is how your backend knows who is asking.
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
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

export function getNotes() {
  return request<Note[]>('/api/notes');
}

export function createNote(body: string, isPublic: boolean) {
  return request<Note>('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ body, is_public: isPublic }),
  });
}

export function deleteNote(id: number) {
  return request<{ ok: true }>(`/api/notes/${id}`, { method: 'DELETE' });
}
