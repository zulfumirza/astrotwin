// JPL Horizons Earth–Mars range via /api/horizons (CORS-safe, cached daily).
// Offline fallback: the Keplerian approximation embedded in engine/delay.ts.
import { earthMarsDistanceAu } from '../engine/delay'
import { fetchJson, withFallback, type Sourced } from './http'

export interface MarsRange {
  au: number
}

export const getMarsRange = (): Promise<Sourced<MarsRange>> =>
  withFallback(
    `horizons:${new Date().toISOString().slice(0, 10)}`,
    async () => {
      const res = await fetchJson<{ au: number }>('/api/horizons', {}, 20_000)
      if (!Number.isFinite(res.au) || res.au <= 0) throw new Error('bad shape')
      return { au: res.au }
    },
    () => ({ au: earthMarsDistanceAu(new Date()) }),
  )
