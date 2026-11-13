const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085/api/v1';

function requestHeaders(headers: HeadersInit | undefined, authToken: string | null): Headers {
  const result = new Headers(headers);
  if (!result.has('Content-Type')) {
    result.set('Content-Type', 'application/json');
  }
  if (authToken && !result.has('Authorization')) {
    result.set('Authorization', 'Bearer ' + authToken);
  }
  return result;
}

function getAuthToken(token?: string): string | null {
  return (
    token ||
    (typeof window !== 'undefined' ? localStorage.getItem('rv_access_token') : null)
  );
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: 'include',
    headers: requestHeaders(headers, getAuthToken(token)),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'API request failed');
  }
  return json;
}

export async function apiFetchBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: requestHeaders(undefined, getAuthToken()),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(json?.message || 'Could not download the invoice.');
  }
  return res.blob();
}
