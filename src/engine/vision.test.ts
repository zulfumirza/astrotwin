import { describe, expect, it } from 'vitest'
import {
  answerAcuity,
  applyDailyCheck,
  assess,
  assessVision,
  buildMission,
  buildPayload,
  EMPTY_BASELINE,
  LOGMAR_LEVELS,
  needsFullAcuity,
  optotypeHeightMm,
  optotypeHeightPx,
  skipUndrawable,
  snellen,
  startAcuity,
  updateBaseline,
  type AmslerAnswer,
  type VisionSession,
} from './index'

const CLEAN: AmslerAnswer = { centerDot: true, allCorners: true, distortion: false, marks: [] }
const WAVY: AmslerAnswer = { centerDot: true, allCorners: true, distortion: true, marks: [[12, 9]] }
const session = (over: Partial<VisionSession> = {}): VisionSession => ({
  mode: 'phone40',
  calibrated: true,
  acuity: { right: 0, left: 0 },
  amsler: { right: CLEAN, left: CLEAN },
  worse: 'no',
  redFlags: false,
  ...over,
})
const BASE = updateBaseline(EMPTY_BASELINE, session())

describe('optotype size (logMAR)', () => {
  it('draws a 20/20 letter at 5 arcmin', () => {
    // 40 cm × tan(5′) ≈ 0.58 mm; 2 m ≈ 2.91 mm
    expect(optotypeHeightMm(400, 0)).toBeCloseTo(0.5818, 3)
    expect(optotypeHeightMm(2000, 0)).toBeCloseTo(2.9088, 3)
    // one logMAR step = ×10^0.1; logMAR 1.0 is 10× bigger
    expect(optotypeHeightMm(400, 1) / optotypeHeightMm(400, 0)).toBeCloseTo(10, 6)
    expect(optotypeHeightPx(400, 1, 4)).toBeCloseTo(23.27, 1)
  })
  it('lists 12 levels from 1.0 down to -0.1', () => {
    expect(LOGMAR_LEVELS[0]).toBe(1)
    expect(LOGMAR_LEVELS.at(-1)).toBe(-0.1)
    expect(LOGMAR_LEVELS).toHaveLength(12)
  })
  it('converts to Snellen', () => {
    expect(snellen(0)).toEqual({ us: '20/20', metric: '6/6' })
    expect(snellen(1)).toEqual({ us: '20/200', metric: '6/60' })
    expect(snellen(0.3).us).toBe('20/40')
    expect(snellen(0.4).metric).toBe('6/15')
    expect(snellen(0.1).metric).toBe('6/7.5')
  })
})

describe('tumbling-E staircase', () => {
  const run = (answers: boolean[]) => answers.reduce(answerAcuity, startAcuity())

  it('passes a level after 3 correct and stops after 3 wrong', () => {
    // 1.0 pass, 0.9 pass, 0.8 fails (3 wrong)
    const s = run([true, true, true, true, true, true, false, false, false])
    expect(s.done).toBe(true)
    expect(s.passed).toBe(0.9)
  })
  it('allows up to 2 misses in a level', () => {
    const s = run([false, true, false, true, true])
    expect(s.passed).toBe(1)
    expect(s.done).toBe(false)
  })
  it('returns null when even logMAR 1.0 is not passed', () => {
    expect(run([false, false, false]).passed).toBeNull()
  })
  it('skips levels too small to draw and notes them', () => {
    // 40 cm on a 3 px/mm screen: logMAR 0.4 is ~4.4 px → skipped with every smaller level
    let s = startAcuity()
    for (let i = 0; i < 6; i++) s = [true, true, true].reduce(answerAcuity, skipUndrawable(s, 400, 3))
    s = skipUndrawable(s, 400, 3)
    expect(s.passed).toBe(0.5)
    expect(s.done).toBe(true)
    expect(s.skipped[0]).toBe(0.4)
    expect(s.skipped.at(-1)).toBe(-0.1)
  })
})

describe('vision rules', () => {
  it('is nominal within 0.1 logMAR of baseline with clean Amsler', () => {
    const o = assessVision(session({ acuity: { right: 0.1, left: 0 } }), BASE)
    expect(o.level).toBe('nominal')
    expect(o.comparable).toBe(true)
  })
  it('is watch at a 0.2 logMAR (2-line) drop or "a little worse"', () => {
    expect(assessVision(session({ acuity: { right: 0.2, left: 0 } }), BASE).level).toBe('watch')
    expect(assessVision(session({ worse: 'little' }), BASE).level).toBe('watch')
  })
  it('is alert at ≥0.3 logMAR drop, a new Amsler distortion, or "clearly worse"', () => {
    expect(assessVision(session({ acuity: { right: 0, left: 0.3 } }), BASE).reasons).toContain('acuityDrop3')
    expect(assessVision(session({ acuity: { right: 0, left: 0.3 } }), BASE).level).toBe('alert')
    expect(assessVision(session({ amsler: { right: CLEAN, left: WAVY } }), BASE).level).toBe('alert')
    expect(assessVision(session({ amsler: { right: { ...CLEAN, centerDot: false }, left: CLEAN } }), BASE).level).toBe('alert')
    expect(assessVision(session({ worse: 'clearly' }), BASE).level).toBe('alert')
  })
  it('counts a below-chart result (null) as a large drop', () => {
    expect(assessVision(session({ acuity: { right: null, left: 0 } }), BASE).level).toBe('alert')
  })
  it('is critical on pain / flashes / floaters / curtain', () => {
    const o = assessVision(session({ redFlags: true }), BASE)
    expect(o.level).toBe('critical')
    expect(o.reasons).toContain('redFlags')
  })
  it('does not compare acuity when uncalibrated or when the distance mode changed', () => {
    const unc = assessVision(session({ calibrated: false, acuity: { right: 0.5, left: 0.5 } }), BASE)
    expect(unc.level).toBe('nominal')
    expect(unc.comparable).toBe(false)
    expect(unc.reasons).toContain('uncalibrated')
    const moved = assessVision(session({ mode: 'laptop2m', acuity: { right: 0.5, left: 0.5 } }), BASE)
    expect(moved.comparable).toBe(false)
  })
  it('makes the first calibrated measurement the per-eye baseline', () => {
    const first = updateBaseline(EMPTY_BASELINE, session({ acuity: { right: 0.1, left: -0.1 } }))
    expect(first.acuity).toEqual({ right: 0.1, left: -0.1 })
    expect(first.mode).toBe('phone40')
    // later measurements do not overwrite it; uncalibrated ones never set it
    expect(updateBaseline(first, session({ acuity: { right: 0.5, left: 0.5 } })).acuity.right).toBe(0.1)
    expect(updateBaseline(EMPTY_BASELINE, session({ calibrated: false })).acuity).toEqual({})
    expect(assessVision(session(), EMPTY_BASELINE).reasons).toContain('firstBaseline')
  })
  it('only watches an Amsler distortion that was already there at baseline', () => {
    const base = updateBaseline(EMPTY_BASELINE, session({ amsler: { right: WAVY, left: CLEAN } }))
    expect(assessVision(session({ amsler: { right: WAVY, left: CLEAN } }), base).level).toBe('watch')
  })
  it('runs full acuity weekly, on an eye symptom, or daily in demo mode', () => {
    const now = Date.UTC(2026, 10, 14)
    const day = 24 * 3600 * 1000
    expect(needsFullAcuity({ fullDaily: false, eyeSymptom: false, lastFullAt: now - 2 * day, now })).toBe(false)
    expect(needsFullAcuity({ fullDaily: false, eyeSymptom: false, lastFullAt: now - 7 * day, now })).toBe(true)
    expect(needsFullAcuity({ fullDaily: false, eyeSymptom: true, lastFullAt: now - day, now })).toBe(true)
    expect(needsFullAcuity({ fullDaily: true, eyeSymptom: false, lastFullAt: now, now })).toBe(true)
  })
})

describe('vision in the risk engine', () => {
  const MARS = { profile: 'mars' as const, delaySec: 660 }
  const withVision = (scenario: Parameters<typeof buildMission>[0], id: string, v: VisionSession, patch = {}) => {
    const m = buildMission(scenario)
    const outcome = assessVision(v, BASE)
    const p = applyDailyCheck(m, id, { vision: outcome, visionChange: outcome.level !== 'nominal', ...patch })
    return assess(p.crew.find((c) => c.id === id)!, MARS)
  }

  it('makes red flags CRITICAL and shares them even with privacy on', () => {
    const a = withVision('nominal', 'cdr', session({ redFlags: true }))
    expect(a.tier).toBe('critical')
    expect(a.findings[0].id).toBe('event.visionUrgent')
    const p = buildPayload(a, { shareBehavioral: false }, 'en')
    expect(p.privacyApplied).toBe(false)
    expect(p.findings.some((f) => f.id === 'event.visionUrgent')).toBe(true)
  })
  it('feeds the SANS compound rule: Amsler change + headache + high CO₂', () => {
    // Hidden decline has elevated cabin CO₂ for everyone.
    const a = withVision('hidden', 'cdr', session({ amsler: { right: WAVY, left: CLEAN } }), { headache: true })
    const sans = a.findings.find((f) => f.id === 'rule.sans')
    expect(sans?.level).toBe('critical')
    expect(a.findings.some((f) => f.id === 'event.visionAlert')).toBe(true)
  })
  it('stays quiet for a clean check', () => {
    const a = withVision('nominal', 'cdr', session())
    expect(a.findings.filter((f) => f.id.startsWith('event.vision'))).toEqual([])
    expect(a.tier).toBe('routine')
  })
})

describe('vital-sign limits (prototype thresholds)', () => {
  const MARS = { profile: 'mars' as const, delaySec: 660 }
  const at = (patch: Record<string, number>) => {
    const m = applyDailyCheck(buildMission('nominal'), 'cdr', patch)
    return assess(m.crew.find((c) => c.id === 'cdr')!, MARS)
  }
  const levelOf = (a: ReturnType<typeof at>, id: string) => a.findings.find((f) => f.id === `metric.${id}`)?.level ?? 'nominal'

  it('SpO2: below 94 % → watch, below 90 % → alert', () => {
    expect(levelOf(at({ spo2: 95 }), 'spo2')).toBe('nominal')
    expect(levelOf(at({ spo2: 93 }), 'spo2')).toBe('watch')
    expect(levelOf(at({ spo2: 89 }), 'spo2')).toBe('alert')
  })
  it('temperature: 37.8 °C → watch, 38.5 °C → alert', () => {
    expect(at({ tempC: 37.8 }).metrics.tempC.limitLevel).toBe('watch')
    expect(at({ tempC: 38.5 }).metrics.tempC.limitLevel).toBe('alert')
    expect(at({ tempC: 37.0 }).metrics.tempC.limitLevel).toBe('nominal')
  })
  it('blood pressure: 140 systolic or 90 diastolic → watch', () => {
    expect(at({ sysBp: 140 }).metrics.sysBp.limitLevel).toBe('watch')
    expect(at({ diaBp: 90 }).metrics.diaBp.limitLevel).toBe('watch')
    expect(at({ sysBp: 128, diaBp: 80 }).metrics.sysBp.limitLevel).toBe('nominal')
  })
  it('keeps the nominal crew free of vital findings', () => {
    const a = at({})
    for (const id of ['restHr', 'sysBp', 'diaBp', 'spo2', 'tempC', 'sleepH', 'exerciseMin']) expect(levelOf(a, id), id).toBe('nominal')
  })
})
