// assess(): the deterministic scoring core. Scores, alarms and tiers are
// computed HERE and nowhere else. The LLM only narrates this output and can
// never change a score, threshold or tier.

import { metricState } from './baseline'
import { CAREER_LIMIT_MSV, CO2_ELEVATED_MMHG, METRIC_IDS, METRICS } from './model'
import { compoundFindings, SOURCES } from './rules'
import type {
  AssessContext,
  Assessment,
  CrewMember,
  Finding,
  HazardId,
  HazardState,
  Level,
  MetricId,
  MetricState,
  Mission,
  Tier,
} from './types'

export const HAZARD_IDS: HazardId[] = [
  'radiation',
  'isolation',
  'distance',
  'gravity',
  'environment',
]

const LEVEL_RANK: Record<Level, number> = { nominal: 0, watch: 1, alert: 2, critical: 3 }
const PENALTY: Record<Level, number> = { nominal: 0, watch: 12, alert: 25, critical: 45 }
export const maxLevel = (a: Level, b: Level): Level => (LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b)

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0)
const round1 = (n: number) => Math.round(n * 10) / 10

function scoreToLevel(score: number): Level {
  if (score >= 80) return 'nominal'
  if (score >= 60) return 'watch'
  if (score >= 40) return 'alert'
  return 'critical'
}

export function tierOf(findings: Finding[]): Tier {
  if (findings.some((f) => f.level === 'critical')) return 'critical'
  if (findings.some((f) => f.level === 'alert')) return 'anomaly'
  return 'routine'
}

export function assess(crew: CrewMember, ctx: AssessContext): Assessment {
  const days = crew.days
  const record = days[days.length - 1]
  const sepActive = Boolean(ctx.sepActive || record.sepActive)

  const metrics = Object.fromEntries(
    METRIC_IDS.map((id) => [id, metricState(days, id)]),
  ) as Record<MetricId, MetricState>

  // Sleep debt: hours missed over the last 7 days against the person's own
  // expected space sleep (baseline + adaptation), never negative per night.
  const last7 = days.slice(-7)
  const sleepNeed = metrics.sleepH.expected
  const sleepDebt7 = last7.reduce((s, d) => s + Math.max(0, sleepNeed - d.sleepH), 0)
  const co2Avg3 = mean(days.slice(-3).map((d) => d.co2))
  const stressAvg5 = mean(days.slice(-5).map((d) => d.stress))
  const cumulativeDoseMsv = days.reduce((s, d) => s + d.doseMsv, 0)
  const careerLimitPct = (cumulativeDoseMsv / CAREER_LIMIT_MSV) * 100

  const findings: Finding[] = []

  // Single-metric findings (three-layer normal).
  for (const id of METRIC_IDS) {
    const m = metrics[id]
    if (!m.deviant && !m.outsideEarth) continue
    findings.push({
      id: `metric.${id}`,
      kind: 'metric',
      hazard: METRICS[id].hazard,
      level: m.zBad >= 3 || m.outsideEarth ? 'alert' : 'watch',
      behavioral: METRICS[id].behavioral,
      params: {
        value: m.value,
        expected: Number(m.expected.toFixed(METRICS[id].digits)),
        unit: METRICS[id].unit,
        z: round1(m.z),
        twinDay: m.twinAlarmDay ?? '—',
        earthDay: m.earthAlarmDay ?? '—',
      },
      sourceUrl: SOURCES.risks,
    })
  }

  // Event findings.
  if (co2Avg3 >= CO2_ELEVATED_MMHG) {
    findings.push({
      id: 'event.co2',
      kind: 'event',
      hazard: 'environment',
      level: 'watch',
      behavioral: false,
      params: { co2: round1(co2Avg3), limit: CO2_ELEVATED_MMHG },
      sourceUrl: SOURCES.hazards,
    })
  }
  if (record.visionChange) {
    findings.push({
      id: 'event.vision',
      kind: 'event',
      hazard: 'gravity',
      level: 'watch',
      behavioral: false,
      params: {},
      sourceUrl: SOURCES.risks,
    })
  }
  if (record.rash) {
    findings.push({
      id: 'event.rash',
      kind: 'event',
      hazard: 'environment',
      level: 'watch',
      behavioral: false,
      params: {},
      sourceUrl: SOURCES.research,
    })
  }
  if (sepActive && !record.eva) {
    findings.push({
      id: 'event.sep',
      kind: 'event',
      hazard: 'radiation',
      level: 'alert',
      behavioral: false,
      params: {},
      sourceUrl: SOURCES.donki,
    })
  }
  if (careerLimitPct >= 50) {
    findings.push({
      id: 'event.dose',
      kind: 'event',
      hazard: 'radiation',
      level: careerLimitPct >= 80 ? 'alert' : 'watch',
      behavioral: false,
      params: { pct: Math.round(careerLimitPct), dose: Math.round(cumulativeDoseMsv) },
      sourceUrl: SOURCES.csa,
    })
  }

  findings.push(
    ...compoundFindings({ days, record, metrics, sleepDebt7, co2Avg3, stressAvg5, sepActive }),
  )

  // Distance hazard: when something is wrong and Earth cannot answer in real
  // time, the crew must act on the onboard protocol.
  const tierBeforeAutonomy = tierOf(findings)
  if (tierBeforeAutonomy !== 'routine' && ctx.delaySec >= 60) {
    findings.push({
      id: 'event.autonomy',
      kind: 'event',
      hazard: 'distance',
      level: 'watch',
      behavioral: false,
      params: { roundTripMin: round1((ctx.delaySec * 2) / 60) },
      sourceUrl: SOURCES.hazards,
    })
  }

  findings.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])

  const hazards: HazardState[] = HAZARD_IDS.map((id) => {
    const own = findings.filter((f) => f.hazard === id)
    let score = 100 - own.reduce((s, f) => s + PENALTY[f.level], 0)
    if (id === 'distance') score -= Math.min(30, (ctx.delaySec / 60) * 1.5)
    if (id === 'radiation') score -= Math.min(30, careerLimitPct * 0.3)
    score = Math.round(Math.max(5, Math.min(100, score)))
    const level = own.reduce<Level>((l, f) => maxLevel(l, f.level), scoreToLevel(score))
    return { id, score, level }
  })

  const scores = hazards.map((h) => h.score)
  const score = Math.round(0.5 * Math.min(...scores) + 0.5 * mean(scores))

  return {
    crewId: crew.id,
    name: crew.name,
    day: record.day,
    tier: tierOf(findings),
    score,
    hazards,
    metrics,
    findings,
    record,
    sleepDebt7,
    co2Avg3,
    cumulativeDoseMsv,
    careerLimitPct,
    delaySec: ctx.delaySec,
    profile: ctx.profile,
  }
}

export function assessMission(mission: Mission, ctx: AssessContext): Assessment[] {
  return mission.crew.map((c) => assess(c, ctx))
}

const TIER_RANK: Record<Tier, number> = { routine: 0, anomaly: 1, critical: 2 }
export const worstTier = (list: Assessment[]): Tier =>
  list.reduce<Tier>((t, a) => (TIER_RANK[a.tier] > TIER_RANK[t] ? a.tier : t), 'routine')
