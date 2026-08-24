const SUPABASE_URL = process.env.TASHILRADAR_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TASHILRADAR_SUPABASE_SERVICE_ROLE_KEY;

export function assertSupabaseAdminConfigured(): void {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("supabase_admin_not_configured");
  }
}

async function adminFetch<T>(path: string, init: RequestInit): Promise<T> {
  assertSupabaseAdminConfigured();
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY!,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`supabase_admin_request_failed:${response.status}:${text.slice(0, 300)}`);
  }
  return (text ? JSON.parse(text) : null) as T;
}

export async function callAdminRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  return adminFetch<T>(`/rest/v1/rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function insertAdminRow<T>(table: string, body: Record<string, unknown>): Promise<T[]> {
  return adminFetch<T[]>(`/rest/v1/${table}`, {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(body),
  });
}
