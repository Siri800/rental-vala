const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085/api/v1';

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const authToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('rv_access_token') : null);

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'API request failed');
  }
  return json;
}