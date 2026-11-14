// Space-weather helpers and the embedded GLE74 replay (11 May 2024).
// Embedded data is the OFFLINE FALLBACK; live DONKI / GOES data replaces it
// when the backend is reachable.

/** NOAA S1 threshold: ≥10 MeV integral proton flux of 10 pfu. */
export const S1_THRESHOLD_PFU = 10

export interface ProtonPoint {
  /** ISO time (UTC). */
  time: string
  /** ≥10 MeV integral flux, pfu. */
  p10: number
  /** ≥100 MeV integral flux, pfu. */
  p100: number
}

export function isSepActive(points: ProtonPoint[]): boolean {
  const last = points[points.length - 1]
  return Boolean(last && last.p10 >= S1_THRESHOLD_PFU)
}

export interface SpaceWeatherEvent {
  id: string
  type: 'FLR' | 'SEP' | 'CME' | 'NOTE'
  time: string
  title: string
  link?: string
}

// Embedded GLE74 timeline (values supplied with the project brief):
// X5.8 flare peak 01:32 UT; GOES >100 MeV protons begin rising 01:45 UT, peak 02:45 UT.
export const GLE74 = {
  date: '2024-05-11',
  flarePeak: '2024-05-11T01:32:00Z',
  protonOnset: '2024-05-11T01:45:00Z',
  protonPeak: '2024-05-11T02:45:00Z',
  replayStart: '2024-05-11T00:30:00Z',
  replayEnd: '2024-05-11T05:00:00Z',
} as const

export const GLE74_EVENTS: SpaceWeatherEvent[] = [
  { id: 'gle74-flr', type: 'FLR', time: GLE74.flarePeak, title: 'X5.8 flare peak (AR 13664)' },
  { id: 'gle74-sep', type: 'SEP', time: GLE74.protonOnset, title: 'GOES >100 MeV protons begin rising (GLE74)' },
  { id: 'gle74-peak', type: 'SEP', time: GLE74.protonPeak, title: 'GOES >100 MeV proton peak' },
]

/**
 * Embedded, schematic proton profile for the replay (5-minute steps).
 * Shape only: onset and peak times follow the timeline above; magnitudes are
 * illustrative, not GOES measurements.
 */
export function gle74ProtonSeries(): ProtonPoint[] {
  const start = Date.parse(GLE74.replayStart)
  const end = Date.parse(GLE74.replayEnd)
  const onset = Date.parse(GLE74.protonOnset)
  const peak = Date.parse(GLE74.protonPeak)
  const out: ProtonPoint[] = []
  for (let t = start; t <= end; t += 5 * 60_000) {
    let rise = 0
    if (t >= onset && t <= peak) rise = (t - onset) / (peak - onset)
    else if (t > peak) rise = Math.exp(-(t - peak) / (150 * 60_000))
    out.push({
      time: new Date(t).toISOString(),
      // ≥10 MeV was already above S1 before the GLE (ongoing storm since 10 May).
      p10: Math.round((60 + 150 * rise) * 10) / 10,
      p100: Math.round((0.3 + 7.5 * rise) * 100) / 100,
    })
  }
  return out
}

/** In the replay the rule engine treats the GLE onset as "SEP active". */
export function replaySepActive(clockIso: string): boolean {
  return Date.parse(clockIso) >= Date.parse(GLE74.protonOnset)
}

/** Embedded "last 30 days" list shown when DONKI is unreachable and nothing is cached. */
export const EMBEDDED_RECENT_EVENTS: SpaceWeatherEvent[] = []
