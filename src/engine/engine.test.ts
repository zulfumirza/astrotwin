import { describe, expect, it } from 'vitest'
import {
  applyDailyCheck,
  assess,
  assessMission,
  auToDelaySec,
  buildMission,
  buildPayload,
  earthAlarmDay,
  earthMarsDistanceAu,
  formatDelay,
  gle74ProtonSeries,
  isSepActive,
  isValidSbar,
  numbersAreGrounded,
  replaySepActive,
  templateSbar,
  twinAlarmDay,
  worstTier,
  type AssessContext,
} from './index'

const MARS: AssessContext = { profile: 'mars', delaySec: 660 }
const byId = (scenario: Parameters<typeof buildMission>[0], id: string) => {
  const mission = buildMission(scenario)
  return { mission, crew: mission.crew.find((c) => c.id === id)! }
}

describe('scenario: nominal cruise', () => {
  it('is deterministic', () => {
    expect(buildMission('nominal')).toEqual(buildMission('nominal'))
  })
  it('keeps every crew member at routine tier with no compound risks', () => {
    const all = assessMission(buildMission('nominal'), MARS)
    expect(worstTier(all)).toBe('routine')
    for (const a of all) {
      expect(a.findings.filter((f) => f.kind === 'compound')).toEqual([])
      expect(a.score).toBeGreaterThanOrEqual(80)
    }
  })
})

describe('scenario: hidden decline', () => {
  const { crew } = byId('hidden', 'plt')
  const a = assess(crew, MARS)

  it('produces a CRITICAL tier', () => {
    expect(a.tier).toBe('critical')
  })
  it('fires judgment impairment with all three factors', () => {
    const rule = a.findings.find((f) => f.id === 'rule.judgment')!
    expect(rule.level).toBe('critical')
    expect(rule.params.hits).toBe(3)
    expect(a.sleepDebt7).toBeGreaterThanOrEqual(5)
    expect(a.co2Avg3).toBeGreaterThanOrEqual(3)
  })
  it('flags the declared–measured conflict ("I\'m fine" vs. the data)', () => {
    expect(a.record.feelsFine).toBe(true)
    expect(a.findings.some((f) => f.id === 'rule.conflict')).toBe(true)
  })
  it('computes the "Earth rule vs AstroTwin" counters for reaction time', () => {
    const earth = earthAlarmDay(crew.days, 'pvtMs')
    const twin = twinAlarmDay(crew.days, 'pvtMs')
    // Decline starts on day 15. AstroTwin catches it within about a week;
    // the Earth-range rule needs more than two extra weeks.
    expect(twin).toBe(21)
    expect(earth).toBe(36)
    expect(earth! - twin!).toBe(15) // "AstroTwin warns 15 days earlier"
    expect(a.metrics.pvtMs.twinAlarmDay).toBe(twin)
    expect(a.metrics.pvtMs.earthAlarmDay).toBe(earth)
  })
  it('never alarms inside the 14-day baseline window', () => {
    for (const id of ['pvtMs', 'sleepH', 'hrv'] as const) {
      expect(twinAlarmDay(crew.days, id)!).toBeGreaterThan(14)
    }
  })
  it('leaves the other crew members out of the critical tier', () => {
    const { mission } = byId('hidden', 'plt')
    const others = assessMission(mission, MARS).filter((x) => x.crewId !== 'plt')
    expect(others.every((x) => x.tier !== 'critical')).toBe(true)
  })
})

describe('scenario: solar storm (GLE74 replay)', () => {
  const { crew, mission } = byId('storm', 'ms1')
  it('is critical only once the SEP is active during the EVA', () => {
    expect(assess(crew, { ...MARS, sepActive: false }).tier).toBe('routine')
    const a = assess(crew, { ...MARS, sepActive: true })
    expect(a.tier).toBe('critical')
    expect(a.findings[0].id).toBe('rule.sepEva')
  })
  it('gives crew inside the vehicle a shelter alert, not a critical', () => {
    const inside = mission.crew.find((c) => c.id === 'cdr')!
    const a = assess(inside, { ...MARS, sepActive: true })
    expect(a.tier).toBe('anomaly')
    expect(a.findings.some((f) => f.id === 'event.sep')).toBe(true)
  })
  it('replays the embedded timeline', () => {
    expect(replaySepActive('2024-05-11T01:40:00Z')).toBe(false)
    expect(replaySepActive('2024-05-11T01:45:00Z')).toBe(true)
    const series = gle74ProtonSeries()
    const peak = series.reduce((m, p) => (p.p100 > m.p100 ? p : m))
    expect(peak.time).toBe('2024-05-11T02:45:00.000Z')
    expect(isSepActive(series)).toBe(true)
  })
})

describe('scenario: immune watch', () => {
  it('flags latent virus reactivation as critical', () => {
    const { crew } = byId('immune', 'ms2')
    const a = assess(crew, MARS)
    const rule = a.findings.find((f) => f.id === 'rule.virus')!
    expect(rule.params.hits).toBe(3)
    expect(a.tier).toBe('critical')
  })
})

describe('compound rule: vision + CO₂ (SANS)', () => {
  it('fires when the Amsler self-test is abnormal and CO₂ is high', () => {
    const { mission } = byId('hidden', 'cdr')
    const patched = applyDailyCheck(mission, 'cdr', { visionChange: true })
    const a = assess(patched.crew.find((c) => c.id === 'cdr')!, MARS)
    expect(a.findings.some((f) => f.id === 'rule.sans')).toBe(true)
    expect(a.tier).not.toBe('routine')
  })
})

describe('privacy and SBAR', () => {
  const { mission } = byId('hidden', 'plt')

  it('always shares everything at critical tier', () => {
    const a = assess(mission.crew.find((c) => c.id === 'plt')!, MARS)
    const p = buildPayload(a, { shareBehavioral: false }, 'en')
    expect(p.privacyApplied).toBe(false)
    expect(p.behavioral).toBeDefined()
    expect(p.withheld).toBe(0)
  })
  it('withholds behavioural detail below critical when sharing is off', () => {
    // Day 24 of the same decline: reaction time is off-trajectory but nothing is critical yet.
    const early = buildMission('hidden', 'mars', 24)
    const a = assess(early.crew.find((c) => c.id === 'plt')!, MARS)
    expect(a.tier).not.toBe('critical')
    const hidden = buildPayload(a, { shareBehavioral: false }, 'en')
    const open = buildPayload(a, { shareBehavioral: true }, 'en')
    expect(hidden.behavioral).toBeUndefined()
    expect(hidden.findings.some((f) => f.id === 'metric.pvtMs')).toBe(false)
    expect(hidden.withheld).toBeGreaterThan(0)
    expect(JSON.stringify(hidden)).not.toContain('pvtMs')
    expect(open.findings.some((f) => f.id === 'metric.pvtMs')).toBe(true)
  })
  it('writes a valid template SBAR in both languages with grounded numbers', () => {
    const a = assess(mission.crew.find((c) => c.id === 'plt')!, MARS)
    for (const lang of ['en', 'tr'] as const) {
      const p = buildPayload(a, { shareBehavioral: true }, lang)
      const sbar = templateSbar(p)
      expect(isValidSbar(sbar)).toBe(true)
      expect(numbersAreGrounded(sbar, p)).toBe(true)
    }
  })
  it('rejects narrator output that invents a number or breaks the schema', () => {
    const a = assess(mission.crew.find((c) => c.id === 'plt')!, MARS)
    const p = buildPayload(a, { shareBehavioral: true }, 'en')
    const sbar = templateSbar(p)
    expect(numbersAreGrounded({ ...sbar, assessment: 'Reaction time is 999 ms.' }, p)).toBe(false)
    expect(isValidSbar({ ...sbar, crewMessage: '' })).toBe(false)
    expect(isValidSbar({ situation: 'x' })).toBe(false)
  })
})

describe('distance from Earth', () => {
  it('matches JPL Horizons for 2026-11-14 within 1%', () => {
    // Horizons observer range (Mars from geocenter) 2026-Nov-14 00:00 UT: 1.32436 AU.
    const au = earthMarsDistanceAu(new Date('2026-11-14T00:00:00Z'))
    expect(Math.abs(au - 1.32436) / 1.32436).toBeLessThan(0.01)
    expect(auToDelaySec(1)).toBeCloseTo(499.0, 1)
    expect(formatDelay(659.9)).toBe('11 min 00 s')
    expect(formatDelay(1.28)).toBe('1.28 s')
  })
})
