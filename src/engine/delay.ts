// Distance-from-Earth hazard: signal delay.
import type { MissionProfileId } from './types'

export const LIGHT_SECONDS_PER_AU = 499.004784

/** Fixed one-way delays for near-Earth profiles (seconds). */
export const FIXED_DELAY_SEC: Record<Exclude<MissionProfileId, 'mars'>, number> = {
  leo: 0.0014, // ~420 km
  moon: 1.28, // ~384,400 km
}

export const auToDelaySec = (au: number) => au * LIGHT_SECONDS_PER_AU

// Offline fallback for the Earth–Mars range: JPL "Approximate Positions of the
// Planets" Keplerian elements (J2000 + per-century rates, valid 1800–2050).
// Agrees with Horizons to well under 1%, which is plenty for a delay readout.
const ELEMENTS = {
  earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
  earthRate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  mars: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
  marsRate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
}
const rad = (deg: number) => (deg * Math.PI) / 180

function heliocentric(el: number[], rate: number[], T: number): [number, number, number] {
  const [a, e, I, L, peri, node] = el.map((v, i) => v + rate[i] * T)
  const w = rad(peri - node)
  const M = rad((((L - peri) % 360) + 540) % 360 - 180)
  let E = M
  for (let i = 0; i < 12; i++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  const xp = a * (Math.cos(E) - e)
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const cw = Math.cos(w), sw = Math.sin(w)
  const co = Math.cos(rad(node)), so = Math.sin(rad(node))
  const ci = Math.cos(rad(I)), si = Math.sin(rad(I))
  return [
    (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp,
    (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp,
    sw * si * xp + cw * si * yp,
  ]
}

/** Approximate Earth–Mars distance in AU for a date (embedded model). */
export function earthMarsDistanceAu(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5
  const T = (jd - 2451545.0) / 36525
  const e = heliocentric(ELEMENTS.earth, ELEMENTS.earthRate, T)
  const m = heliocentric(ELEMENTS.mars, ELEMENTS.marsRate, T)
  return Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2])
}

export function formatDelay(sec: number): string {
  if (sec < 1) return `${(sec * 1000).toFixed(1)} ms`
  if (sec < 60) return `${sec.toFixed(2)} s`
  const total = Math.round(sec)
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${m} min ${String(s).padStart(2, '0')} s`
}
