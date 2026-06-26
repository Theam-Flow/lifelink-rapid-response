// Offline store-and-forward queue for SOS signals.
//
// In a disaster zone connectivity is intermittent: a victim may tap SOS with no
// signal. Instead of failing, we persist the SOS locally and replay it the
// moment any connection returns. This is client-side (localStorage + the
// `online` event) on purpose — it works on every browser, including iOS Safari,
// which does not support the Background Sync API.

const STORAGE_KEY = 'lifelink_pending_sos';

export type SOSPayload = Record<string, unknown>;

export interface QueuedSOS {
  id: string;
  payload: SOSPayload;
  queuedAt: string;
}

function read(): QueuedSOS[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedSOS[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedSOS[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage unavailable / full — nothing else we can do
  }
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

/** Persist an SOS to be sent when connectivity returns. */
export function enqueueSOS(payload: SOSPayload): QueuedSOS {
  const item: QueuedSOS = { id: newId(), payload, queuedAt: new Date().toISOString() };
  write([...read(), item]);
  return item;
}

export function getPendingCount(): number {
  return read().length;
}

/** True when an error is a transport/connectivity failure (worth queueing). */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (err instanceof TypeError) return true; // fetch() rejects with TypeError when offline
  const msg = ((err as { message?: string } | null)?.message ?? '').toLowerCase();
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('offline') ||
    msg.includes('failed to')
  );
}

export type SOSSender = (payload: SOSPayload) => Promise<{ error: unknown }>;

/**
 * Replay queued SOS in order. Stops at the first failure (still offline) and
 * keeps the remaining items for the next attempt. Returns how many were sent.
 */
export async function flushQueue(send: SOSSender): Promise<number> {
  const items = read();
  if (items.length === 0) return 0;

  let sent = 0;
  for (const item of items) {
    try {
      const { error } = await send(item.payload);
      if (error) break;
    } catch {
      break;
    }
    sent += 1;
  }

  if (sent > 0) write(read().slice(sent));
  return sent;
}
