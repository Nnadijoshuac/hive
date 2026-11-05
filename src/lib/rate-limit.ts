// A small in-memory cap on live jobs, so a public demo can't run up the NEAR AI bill.
// Each visitor (by IP) gets PER_VISITOR jobs per window, and the whole site gets SITE_WIDE per window.
// It resets when the server restarts, which is fine for a demo; a real deployment would use a shared store.

const WINDOW_MS = 60 * 60 * 1000; // one hour
const PER_VISITOR = 3;
const SITE_WIDE = 60;

const hits = new Map<string, number[]>();

/** Records a job for this visitor if they are under both caps. Returns minutes to wait if they are not. */
export function takeJob(visitor: string, now = Date.now()): { ok: true } | { ok: false; waitMinutes: number } {
  const recent = (key: string) => (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  const mine = recent(visitor);
  const all = recent('*');

  const full = mine.length >= PER_VISITOR ? mine : all.length >= SITE_WIDE ? all : null;
  if (full) return { ok: false, waitMinutes: Math.ceil((WINDOW_MS - (now - full[0])) / 60000) };

  hits.set(visitor, [...mine, now]);
  hits.set('*', [...all, now]);
  return { ok: true };
}

/** The caller's IP as the proxy reports it, or a shared key when there is none (local runs). */
export function visitorOf(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
}
