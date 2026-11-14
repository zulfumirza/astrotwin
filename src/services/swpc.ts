// NOAA SWPC GOES integral proton flux via /api/swpc (no key needed upstream,
// proxied anyway for caching and a uniform fallback).
import type { ProtonPoint } from '../engine/radiation'
import { fetchJson, withFallback, type Sourced } from './http'

interface SwpcResponse {
  points: ProtonPoint[]
}

/** Quiet-Sun background used when there is no network and no cached copy. */
function embeddedQuietSeries(): ProtonPoint[] {
  const now = Date.now()
  return Array.from({ length: 36 }, (_, i) => ({
    time: new Date(now - (35 - i) * 10 * 60_000).toISOString(),
    p10: 0.25,
    p100: 0.2,
  }))
}

export const getProtonFlux = (): Promise<Sourced<ProtonPoint[]>> =>
  withFallback(
    'swpc:protons',
    async () => {
      const res = await fetchJson<SwpcResponse>('/api/swpc')
      if (!Array.isArray(res.points) || res.points.length === 0) throw new Error('bad shape')
      return res.points
    },
    embeddedQuietSeries,
  )
