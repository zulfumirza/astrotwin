// Shared client plumbing: timeout, local cache and the live → cache → embedded
// fallback chain. The UI shows which one it got through <SourceBadge>.

export type DataSource = 'live' | 'cache' | 'embedded'

export interface Sourced<T> {
  data: T
  source: DataSource
  /** Epoch ms of the data (when it was fetched); undefined for embedded data. */
  fetchedAt?: number
}

export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 12_000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

const PREFIX = 'astrotwin:cache:'

function readCache<T>(key: string): { at: number; data: T } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as { at: number; data: T }) : null
  } catch {
    return null
  }
}
function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    /* storage full or blocked: the app still works */
  }
}

/**
 * Try the live loader; on any failure use the last good copy from local
 * storage; if there is none, use the data embedded in the app.
 */
export async function withFallback<T>(
  key: string,
  load: () => Promise<T>,
  embedded: () => T,
): Promise<Sourced<T>> {
  try {
    const data = await load()
    writeCache(key, data)
    return { data, source: 'live', fetchedAt: Date.now() }
  } catch {
    const hit = readCache<T>(key)
    if (hit) return { data: hit.data, source: 'cache', fetchedAt: hit.at }
    return { data: embedded(), source: 'embedded' }
  }
}
