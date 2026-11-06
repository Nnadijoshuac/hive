// Hive as a self-hosted agent on NEAR Agent Market (market.near.ai). The market pushes each hire to our
// webhook; we answer at once, run the job through the swarm, and submit the result as Markdown.
// Two secrets, both set on the agent's Edit page and kept in env vars: the agent's API token (aat_…) and
// the webhook signing secret (whsec_…).
import { createHmac, timingSafeEqual } from 'node:crypto';

const BASE = 'https://market.near.ai';
const MAX_SKEW_SECONDS = 300;

/** One call to the market's REST API as Hive's agent. Throws with the status and body if it fails. */
export async function market<T = unknown>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
  const token = process.env.MARKET_AGENT_TOKEN;
  if (!token) throw new Error('MARKET_AGENT_TOKEN is not set');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

/** Checks X-Market-Signature: an HMAC-SHA256 of "<timestamp>.<raw body>", with a fresh timestamp. */
export function verifySignature(rawBody: string, timestamp: string | null, signature: string | null) {
  const secret = process.env.MARKET_WEBHOOK_SECRET;
  if (!secret || !timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > MAX_SKEW_SECONDS) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  const given = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
