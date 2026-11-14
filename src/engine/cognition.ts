// Short cognitive checks added to the daily check, in the spirit of NASA's
// "Cognition" battery for astronauts: Go/No-Go (attention and impulse control)
// and a digit span (working memory). Each person is compared with their own
// first run. Deterministic and explainable; screening only.
import type { Level } from './types'

// ---------------------------------------------------------------------------
// Go / No-Go
// ---------------------------------------------------------------------------

export const GNG_TRIALS = 20
/** Share of "no-go" (do not press) trials. */
export const GNG_NOGO_SHARE = 0.25

export type GngKind = 'go' | 'nogo'

/** A fixed-size, shuffled trial list (5 no-go + 15 go) so every run is comparable. */
export function makeGngTrials(rand: () => number = Math.random): GngKind[] {
  const nogo = Math.round(GNG_TRIALS * GNG_NOGO_SHARE)
  const list: GngKind[] = [...Array(nogo).fill('nogo'), ...Array(GNG_TRIALS - nogo).fill('go')]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

export interface GngResponse {
  kind: GngKind
  pressed: boolean
  /** Reaction time in ms when pressed. */
  rtMs?: number
}

export interface GngResult {
  /** Pressed on a "no-go" (red) trial: impulse errors. */
  commission: number
  /** Missed a "go" (green) trial: lapses of attention. */
  omission: number
  /** Mean reaction time on correct presses, ms. */
  meanRtMs: number
}

export function scoreGng(responses: GngResponse[]): GngResult {
  const hits = responses.filter((r) => r.kind === 'go' && r.pressed && r.rtMs !== undefined)
  return {
    commission: responses.filter((r) => r.kind === 'nogo' && r.pressed).length,
    omission: responses.filter((r) => r.kind === 'go' && !r.pressed).length,
    meanRtMs: hits.length ? Math.round(hits.reduce((s, r) => s + (r.rtMs ?? 0), 0) / hits.length) : 0,
  }
}

// ---------------------------------------------------------------------------
// Digit span
// ---------------------------------------------------------------------------

export const SPAN_START = 3
export const SPAN_MAX = 9

export interface SpanState {
  length: number
  /** Wrong answers at the current length (2 ends the test). */
  misses: number
  /** Longest sequence repeated correctly. */
  best: number
  done: boolean
}

export const startSpan = (): SpanState => ({ length: SPAN_START, misses: 0, best: 0, done: false })

/** Correct → one digit longer; first miss → another try at the same length; second miss → stop. */
export function answerSpan(s: SpanState, correct: boolean): SpanState {
  if (s.done) return s
  if (correct) {
    const best = s.length
    return { length: s.length + 1, misses: 0, best, done: s.length >= SPAN_MAX }
  }
  return s.misses >= 1 ? { ...s, misses: 2, done: true } : { ...s, misses: 1 }
}

/** Random digits with no immediate repeats (easier to see and to say). */
export function makeDigits(length: number, rand: () => number = Math.random): number[] {
  const out: number[] = []
  while (out.length < length) {
    const d = Math.floor(rand() * 10)
    if (d !== out[out.length - 1]) out.push(d)
  }
  return out
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface CognitionResult {
  gng?: GngResult
  span?: number
}
export interface CognitionBaseline {
  span?: number
  gngRtMs?: number
}

export type CognitionReason = 'spanDrop' | 'impulse' | 'lapses' | 'slower' | 'firstBaseline'

export interface CognitionOutcome {
  level: Level
  reasons: CognitionReason[]
  span?: number
  spanBaseline?: number
  gng?: GngResult
}

/**
 * Watch-level only: one bad session is a reason to rest and re-test, not an alarm.
 * The compound "judgment impairment" rule stays based on PVT, sleep and CO₂.
 */
export function assessCognition(r: CognitionResult, base: CognitionBaseline = {}): CognitionOutcome {
  const reasons: CognitionReason[] = []
  if (r.span !== undefined) {
    if (base.span === undefined) reasons.push('firstBaseline')
    else if (base.span - r.span >= 2) reasons.push('spanDrop')
  }
  if (r.gng) {
    if (r.gng.commission >= 3) reasons.push('impulse')
    if (r.gng.omission >= 3) reasons.push('lapses')
    if (base.gngRtMs && r.gng.meanRtMs && r.gng.meanRtMs >= base.gngRtMs * 1.2) reasons.push('slower')
    else if (base.gngRtMs === undefined && !reasons.includes('firstBaseline')) reasons.push('firstBaseline')
  }
  const flagged = reasons.some((x) => x !== 'firstBaseline')
  return { level: flagged ? 'watch' : 'nominal', reasons, span: r.span, spanBaseline: base.span, gng: r.gng }
}

/** The first completed result becomes the personal baseline. */
export function updateCognitionBaseline(base: CognitionBaseline, r: CognitionResult): CognitionBaseline {
  return {
    span: base.span ?? r.span,
    gngRtMs: base.gngRtMs ?? (r.gng && r.gng.meanRtMs > 0 ? r.gng.meanRtMs : undefined),
  }
}
