// Vision Check: a short, screen-based version of what NASA does on the ISS to
// follow SANS (spaceflight-associated neuro-ocular syndrome): far/near visual
// acuity, the Amsler grid and an eye questionnaire.
//
// SCREENING ONLY — NOT A MEDICAL EXAM. Rules are deterministic and explainable;
// thresholds are the ones agreed for this prototype, not a clinical standard.
import type { Level } from './types'

export type Eye = 'right' | 'left'
export const EYES: Eye[] = ['right', 'left']

/** Viewing distance modes. */
export type DistanceMode = 'phone40' | 'laptop2m'
export const DISTANCE_MM: Record<DistanceMode, number> = { phone40: 400, laptop2m: 2000 }

/** ISO/IEC 7810 ID-1 card (bank card, ID card) width. */
export const CARD_WIDTH_MM = 85.6
export const CARD_HEIGHT_MM = 53.98

// ---------------------------------------------------------------------------
// Optotype size (logMAR)
// ---------------------------------------------------------------------------

/** tan(5 arcmin): a 20/20 (logMAR 0.0) letter subtends 5 arcmin. */
export const TAN_5_ARCMIN = 0.0014544

/** Levels shown, largest first: logMAR 1.0 → -0.1 in 0.1 steps. */
export const LOGMAR_LEVELS: number[] = Array.from({ length: 12 }, (_, i) => Math.round((1 - i * 0.1) * 10) / 10)

/** Smallest optotype we can draw honestly (anything smaller is skipped). */
export const MIN_OPTOTYPE_PX = 5

export function optotypeHeightMm(distanceMm: number, logMAR: number): number {
  return distanceMm * TAN_5_ARCMIN * 10 ** logMAR
}
export function optotypeHeightPx(distanceMm: number, logMAR: number, pxPerMm: number): number {
  return optotypeHeightMm(distanceMm, logMAR) * pxPerMm
}

/** Snellen fractions for a logMAR value, e.g. 0.0 → 20/20 and 6/6. */
export function snellen(logMAR: number): { us: string; metric: string } {
  const mar = 10 ** logMAR
  // Metric denominators are rounded to the nearest 0.5, as on printed charts (6/7.5, 6/15).
  return { us: `20/${Math.round(20 * mar)}`, metric: `6/${Math.round(6 * mar * 2) / 2}` }
}

// ---------------------------------------------------------------------------
// Tumbling-E staircase
// ---------------------------------------------------------------------------

export type Direction = 'up' | 'down' | 'left' | 'right'
export const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left']

export const TRIALS_PER_LEVEL = 5
export const PASS_CORRECT = 3

export interface AcuityState {
  /** Index into LOGMAR_LEVELS of the level being tested. */
  levelIndex: number
  correct: number
  wrong: number
  /** Smallest level passed so far (null = none yet). */
  passed: number | null
  /** Levels skipped because they cannot be drawn at this screen density. */
  skipped: number[]
  done: boolean
}

/** Start at logMAR 1.0, skipping nothing yet; call `skipUndrawable` before showing a level. */
export function startAcuity(): AcuityState {
  return { levelIndex: 0, correct: 0, wrong: 0, passed: null, skipped: [], done: false }
}

/**
 * Levels whose optotype would be smaller than MIN_OPTOTYPE_PX are skipped and
 * noted. Because levels only get smaller, reaching one means the test ends.
 */
export function skipUndrawable(s: AcuityState, distanceMm: number, pxPerMm: number): AcuityState {
  if (s.done) return s
  const lvl = LOGMAR_LEVELS[s.levelIndex]
  if (optotypeHeightPx(distanceMm, lvl, pxPerMm) >= MIN_OPTOTYPE_PX) return s
  const skipped = LOGMAR_LEVELS.slice(s.levelIndex).filter((l) => optotypeHeightPx(distanceMm, l, pxPerMm) < MIN_OPTOTYPE_PX)
  return { ...s, skipped: [...s.skipped, ...skipped], done: true }
}

/**
 * Record one answer. Each level shows up to 5 E's: 3 correct passes the level
 * (move one smaller); once 3 are wrong, 3/5 is impossible and the eye's test
 * stops. The level ends as soon as its outcome is decided, to keep it short.
 */
export function answerAcuity(s: AcuityState, correct: boolean): AcuityState {
  if (s.done) return s
  const next = { ...s, correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }
  if (next.correct >= PASS_CORRECT) {
    const passed = LOGMAR_LEVELS[s.levelIndex]
    const levelIndex = s.levelIndex + 1
    return { ...next, passed, levelIndex, correct: 0, wrong: 0, done: levelIndex >= LOGMAR_LEVELS.length }
  }
  if (next.wrong > TRIALS_PER_LEVEL - PASS_CORRECT) return { ...next, done: true }
  return next
}

/** Final result: the smallest level passed, or null if even logMAR 1.0 was not passed. */
export const acuityResult = (s: AcuityState) => s.passed

// ---------------------------------------------------------------------------
// Session, baseline and rules
// ---------------------------------------------------------------------------

export interface AmslerAnswer {
  centerDot: boolean
  allCorners: boolean
  distortion: boolean
  /** Cells marked as wrong, [col, row] in a 20×20 grid. */
  marks: [number, number][]
}
export const amslerClean = (a: AmslerAnswer) => a.centerDot && a.allCorners && !a.distortion

export type WorseAnswer = 'no' | 'little' | 'clearly'

export interface VisionSession {
  mode: DistanceMode
  /** False when the screen was not calibrated: acuity is then not compared with the baseline. */
  calibrated: boolean
  /** logMAR per eye; undefined = acuity not run today (quick check); null = below logMAR 1.0. */
  acuity?: Record<Eye, number | null>
  amsler: Record<Eye, AmslerAnswer>
  worse: WorseAnswer
  /** Eye pain, new floaters, flashes or a curtain over vision. */
  redFlags: boolean
}

export interface VisionBaseline {
  mode?: DistanceMode
  acuity: Partial<Record<Eye, number | null>>
  amslerClean: Partial<Record<Eye, boolean>>
}
export const EMPTY_BASELINE: VisionBaseline = { acuity: {}, amslerClean: {} }

export type VisionReason =
  | 'redFlags'
  | 'acuityDrop3'
  | 'acuityDrop2'
  | 'amslerNew'
  | 'amslerKnown'
  | 'clearlyWorse'
  | 'littleWorse'
  | 'uncalibrated'
  | 'firstBaseline'

export interface VisionOutcome {
  level: Level
  reasons: VisionReason[]
  /** Worst per-eye acuity drop versus baseline in logMAR (0 when not comparable). */
  acuityDrop: number
  /** Acuity was compared with the baseline. */
  comparable: boolean
  redFlags: boolean
  acuity?: Record<Eye, number | null>
}

const RANK: Record<Level, number> = { nominal: 0, watch: 1, alert: 2, critical: 3 }
const worse = (a: Level, b: Level): Level => (RANK[a] >= RANK[b] ? a : b)
/** logMAR used for "could not pass 1.0" when comparing. */
const FLOOR = 1.1
const r1 = (n: number) => Math.round(n * 100) / 100

export function assessVision(s: VisionSession, base: VisionBaseline = EMPTY_BASELINE): VisionOutcome {
  const reasons: VisionReason[] = []
  let level: Level = 'nominal'
  const bump = (l: Level, r: VisionReason) => {
    level = worse(level, l)
    reasons.push(r)
  }

  // Critical: urgent eye symptoms. Sent to Earth automatically, privacy setting does not apply.
  if (s.redFlags) bump('critical', 'redFlags')

  // Acuity: compared only with a calibrated baseline taken in the same distance mode.
  let acuityDrop = 0
  let comparable = false
  if (s.acuity) {
    const baseHas = EYES.some((e) => base.acuity[e] !== undefined)
    if (!s.calibrated || (baseHas && base.mode !== s.mode)) {
      reasons.push('uncalibrated')
    } else if (!baseHas) {
      reasons.push('firstBaseline')
    } else {
      comparable = true
      for (const e of EYES) {
        const b = base.acuity[e]
        if (b === undefined) continue
        const drop = (s.acuity[e] ?? FLOOR) - (b ?? FLOOR)
        acuityDrop = Math.max(acuityDrop, r1(drop))
      }
      if (acuityDrop >= 0.3 - 1e-9) bump('alert', 'acuityDrop3')
      else if (acuityDrop >= 0.2 - 1e-9) bump('watch', 'acuityDrop2')
    }
  }

  // Amsler: a NEW distortion or missing area in either eye → tell the flight surgeon today.
  for (const e of EYES) {
    if (amslerClean(s.amsler[e])) continue
    if (base.amslerClean[e] === false) bump('watch', 'amslerKnown')
    else bump('alert', 'amslerNew')
  }

  if (s.worse === 'clearly') bump('alert', 'clearlyWorse')
  else if (s.worse === 'little') bump('watch', 'littleWorse')

  return { level, reasons: [...new Set(reasons)], acuityDrop, comparable, redFlags: s.redFlags, acuity: s.acuity }
}

/**
 * The first valid measurement becomes the personal baseline, per eye.
 * Acuity only counts when calibrated; Amsler always counts.
 */
export function updateBaseline(base: VisionBaseline, s: VisionSession): VisionBaseline {
  const next: VisionBaseline = { mode: base.mode, acuity: { ...base.acuity }, amslerClean: { ...base.amslerClean } }
  for (const e of EYES) {
    if (next.amslerClean[e] === undefined) next.amslerClean[e] = amslerClean(s.amsler[e])
    if (s.acuity && s.calibrated && next.acuity[e] === undefined && (!next.mode || next.mode === s.mode)) {
      next.acuity[e] = s.acuity[e]
      next.mode = s.mode
    }
  }
  return next
}

/** Full acuity runs weekly, when the crew reported an eye change, or daily in demo mode. */
export function needsFullAcuity(opts: { fullDaily: boolean; eyeSymptom: boolean; lastFullAt?: number; now: number }) {
  if (opts.fullDaily || opts.eyeSymptom || opts.lastFullAt === undefined) return true
  return opts.now - opts.lastFullAt >= 7 * 24 * 3600 * 1000
}
