// Three-layer normal:
//   1. Earth reference range            (METRICS[id].earth)
//   2. Personal baseline, flight day 1–14
//   3. Expected space-adaptation curve  (METRICS[id].adapt)
// The AstroTwin alarm fires when a person leaves THEIR OWN expected space
// trajectory — not when they finally leave the Earth range.

import { BASELINE_DAYS, METRICS } from './model'
import type { Baseline, DayRecord, MetricId, MetricState } from './types'

export const Z_ALARM = 2
export const PERSISTENCE_DAYS = 3

export function computeBaseline(days: DayRecord[], id: MetricId): Baseline {
  const def = METRICS[id]
  const window = days.filter((d) => d.day <= BASELINE_DAYS)
  if (window.length === 0) return { mean: 0, sd: def.sdFloor }
  // Remove the expected adaptation so the baseline is the "day 0" person.
  // adapt() may depend on the baseline (body mass); one fixed-point pass is enough.
  const raw = window.reduce((s, d) => s + d[id], 0) / window.length
  const resid = window.map((d) => d[id] - def.adapt(d.day, raw))
  const mean = resid.reduce((s, v) => s + v, 0) / resid.length
  const variance =
    resid.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, resid.length - 1)
  return { mean, sd: Math.max(def.sdFloor, Math.sqrt(variance)) }
}

export function expectedValue(id: MetricId, baseline: Baseline, day: number) {
  return baseline.mean + METRICS[id].adapt(day, baseline.mean)
}

/** Signed so that positive = unhealthy direction (either direction for two-sided metrics). */
const toBad = (id: MetricId, z: number) =>
  METRICS[id].bad === 'high' ? z : METRICS[id].bad === 'low' ? -z : Math.abs(z)

function outsideEarth(id: MetricId, value: number) {
  const [lo, hi] = METRICS[id].earth
  const bad = METRICS[id].bad
  return bad === 'high' ? value > hi : bad === 'low' ? value < lo : value > hi || value < lo
}

/** z-score of one day against the expected space trajectory. */
export function zScore(id: MetricId, baseline: Baseline, rec: DayRecord) {
  return (rec[id] - expectedValue(id, baseline, rec.day)) / baseline.sd
}

/** Mean z over the last `PERSISTENCE_DAYS` days ending at index i. */
function rollingZ(id: MetricId, baseline: Baseline, days: DayRecord[], i: number) {
  const from = Math.max(0, i - PERSISTENCE_DAYS + 1)
  const slice = days.slice(from, i + 1)
  return slice.reduce((s, d) => s + zScore(id, baseline, d), 0) / slice.length
}

/**
 * "Earth rule" counter: first day on which the value has been outside the
 * Earth reference range for PERSISTENCE_DAYS consecutive days.
 */
export function earthAlarmDay(days: DayRecord[], id: MetricId): number | null {
  let run = 0
  for (const d of days) {
    run = outsideEarth(id, d[id]) ? run + 1 : 0
    if (run >= PERSISTENCE_DAYS) return d.day
  }
  return null
}

/**
 * "AstroTwin rule" counter: first day after the baseline window on which the
 * 3-day mean z-score (in the unhealthy direction) reaches Z_ALARM.
 */
export function twinAlarmDay(
  days: DayRecord[],
  id: MetricId,
  baseline: Baseline = computeBaseline(days, id),
): number | null {
  for (let i = 0; i < days.length; i++) {
    if (days[i].day < BASELINE_DAYS + PERSISTENCE_DAYS) continue
    if (toBad(id, rollingZ(id, baseline, days, i)) >= Z_ALARM) return days[i].day
  }
  return null
}

export function metricState(days: DayRecord[], id: MetricId): MetricState {
  const baseline = computeBaseline(days, id)
  const last = days[days.length - 1]
  const z = rollingZ(id, baseline, days, days.length - 1)
  const zBad = toBad(id, z)
  return {
    id,
    value: last[id],
    baseline,
    expected: expectedValue(id, baseline, last.day),
    z,
    zBad,
    deviant: days.length > BASELINE_DAYS && zBad >= Z_ALARM,
    outsideEarth: outsideEarth(id, last[id]),
    earthAlarmDay: earthAlarmDay(days, id),
    twinAlarmDay: twinAlarmDay(days, id, baseline),
  }
}

export interface TwinSeriesPoint {
  day: number
  observed: number
  expected: number
  /** Personal tolerance band: expected ± Z_ALARM·sd. */
  bandLo: number
  bandHi: number
}

/** Chart series for the three-layer normal view. */
export function twinSeries(days: DayRecord[], id: MetricId): TwinSeriesPoint[] {
  const baseline = computeBaseline(days, id)
  return days.map((d) => {
    const expected = expectedValue(id, baseline, d.day)
    return {
      day: d.day,
      observed: d[id],
      expected,
      bandLo: expected - Z_ALARM * baseline.sd,
      bandHi: expected + Z_ALARM * baseline.sd,
    }
  })
}
