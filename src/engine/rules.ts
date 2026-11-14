// Compound risk engine. NASA notes that the five hazards can compound each
// other; these rules look for dangerous COMBINATIONS that single-metric
// thresholds miss. Every rule is deterministic and explainable.

import { CO2_ELEVATED_MMHG } from './model'
import type { DayRecord, Finding, Level, MetricId, MetricState } from './types'

export const SOURCES = {
  hazards: 'https://www.nasa.gov/hrp/hazards/',
  risks: 'https://www.nasa.gov/hrp/risks/',
  research: 'https://www.nasa.gov/hrp/ongoing-hrp-research/',
  csa: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp',
  donki: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
} as const

export const SLEEP_DEBT_ALARM_H = 5
export const STRESS_HIGH = 4

export interface RuleInput {
  days: DayRecord[]
  record: DayRecord
  metrics: Record<MetricId, MetricState>
  sleepDebt7: number
  co2Avg3: number
  stressAvg5: number
  sepActive: boolean
}

const OBJECTIVE: MetricId[] = ['restHr', 'hrv', 'sleepH', 'pvtMs', 'lymph', 'bodyMass']

export function compoundFindings(input: RuleInput): Finding[] {
  const { record, metrics, sleepDebt7, co2Avg3, stressAvg5, sepActive } = input
  const out: Finding[] = []
  const co2High = co2Avg3 >= CO2_ELEVATED_MMHG
  const r1 = (n: number) => Math.round(n * 10) / 10

  // 1. Judgment impairment: sleep debt + slow reaction + high CO₂.
  {
    const parts = [sleepDebt7 >= SLEEP_DEBT_ALARM_H, metrics.pvtMs.deviant, co2High]
    const hits = parts.filter(Boolean).length
    if (hits >= 2) {
      out.push({
        id: 'rule.judgment',
        kind: 'compound',
        hazard: 'isolation',
        level: hits === 3 ? 'critical' : 'alert',
        behavioral: true,
        params: {
          hits,
          debt: r1(sleepDebt7),
          pvt: Math.round(metrics.pvtMs.value),
          pvtBase: Math.round(metrics.pvtMs.expected),
          co2: r1(co2Avg3),
        },
        sourceUrl: SOURCES.hazards,
      })
    }
  }

  // 2. Declared–measured conflict: "I'm fine" while objective data declines.
  {
    const declining = OBJECTIVE.filter((id) => metrics[id].deviant)
    if (record.feelsFine && record.mood >= 4 && declining.length >= 2) {
      out.push({
        id: 'rule.conflict',
        kind: 'compound',
        hazard: 'isolation',
        level: 'alert',
        behavioral: true,
        params: { count: declining.length, mood: record.mood },
        sourceUrl: SOURCES.risks,
      })
    }
  }

  // 3. Solar particle event during EVA.
  if (sepActive && record.eva) {
    out.push({
      id: 'rule.sepEva',
      kind: 'compound',
      hazard: 'radiation',
      level: 'critical',
      behavioral: false,
      params: {},
      sourceUrl: SOURCES.donki,
    })
  }

  // 4. Latent virus reactivation: stress + low lymphocytes + rash.
  {
    const parts = [stressAvg5 >= STRESS_HIGH, metrics.lymph.deviant, record.rash]
    const hits = parts.filter(Boolean).length
    if (hits >= 2) {
      out.push({
        id: 'rule.virus',
        kind: 'compound',
        hazard: 'environment',
        level: hits === 3 ? 'critical' : 'alert',
        behavioral: false,
        params: {
          hits,
          lymph: metrics.lymph.value,
          lymphBase: Math.round(metrics.lymph.expected * 100) / 100,
          stress: r1(stressAvg5),
        },
        sourceUrl: SOURCES.research,
      })
    }
  }

  // 5. Vision change + CO₂ (SANS: spaceflight-associated neuro-ocular syndrome).
  if (record.visionChange && co2High) {
    const level: Level = record.headache ? 'critical' : 'alert'
    out.push({
      id: 'rule.sans',
      kind: 'compound',
      hazard: 'gravity',
      level,
      behavioral: false,
      params: { co2: r1(co2Avg3) },
      sourceUrl: SOURCES.risks,
    })
  }

  return out
}
