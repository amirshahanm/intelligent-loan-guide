import { callAdminRpc } from "./supabase-admin";

const DEFAULT_TTL_HOURS = 24 * 14;

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createSessionCapabilityToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function hashSessionCapability(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export async function registerSessionCapability(sessionId: string, token: string): Promise<void> {
  const tokenHash = await hashSessionCapability(token);
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_HOURS * 60 * 60 * 1000).toISOString();
  await callAdminRpc<null>("tr_register_session_capability", {
    p_session_id: sessionId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
  });
}

export async function verifySessionCapability(sessionId: string, token: string): Promise<boolean> {
  if (!sessionId || !token) return false;
  const tokenHash = await hashSessionCapability(token);
  return callAdminRpc<boolean>("tr_verify_session_capability", {
    p_session_id: sessionId,
    p_token_hash: tokenHash,
  });
}
