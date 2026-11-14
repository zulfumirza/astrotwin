// Data model: metric definitions (three-layer normal), dose models and the
// simulated crew for the four demo scenarios.
//
// NOTE (decision): the original single-file prototype (astrotwin-referans.html)
// was not present in the repo, so this model was rebuilt from the written
// product spec. Thresholds live in one place (this file + rules.ts) so they can
// be reconciled with the prototype quickly.
//
// ALL CREW DATA IS SIMULATED. Not a medical device.

import type {
  CrewMember,
  DayRecord,
  HazardId,
  MetricId,
  Mission,
  MissionProfileId,
  ScenarioId,
} from './types'

export const BASELINE_DAYS = 14
export const SCENARIO_TODAY = 40

export interface MetricDef {
  id: MetricId
  unit: string
  /** Layer 1: Earth clinical reference range. */
  earth: [number, number]
  /** Which direction is unhealthy. */
  bad: 'high' | 'low' | 'both'
  /** Minimum sd used for z-scores (sensor / day-to-day noise floor). */
  sdFloor: number
  /**
   * Layer 3: expected space-adaptation shift on a given mission day, relative
   * to the personal baseline. Modeled, saturating curves (assumptions, see README).
   */
  adapt: (day: number, baseline: number) => number
  hazard: HazardId
  behavioral: boolean
  digits: number
}

const sat = (day: number, tau: number) => 1 - Math.exp(-day / tau)

export const METRICS: Record<MetricId, MetricDef> = {
  restHr: {
    id: 'restHr',
    unit: 'bpm',
    earth: [50, 90],
    bad: 'high',
    sdFloor: 2,
    adapt: (d) => 3 * sat(d, 20),
    hazard: 'gravity',
    behavioral: false,
    digits: 0,
  },
  hrv: {
    id: 'hrv',
    unit: 'ms',
    earth: [40, 110],
    bad: 'low',
    sdFloor: 3,
    adapt: (d) => -4 * sat(d, 20),
    hazard: 'isolation',
    behavioral: false,
    digits: 0,
  },
  sleepH: {
    id: 'sleepH',
    unit: 'h',
    earth: [6, 9.5],
    bad: 'low',
    sdFloor: 0.3,
    adapt: (d) => -0.5 * sat(d, 10),
    hazard: 'isolation',
    behavioral: false,
    digits: 1,
  },
  pvtMs: {
    id: 'pvtMs',
    unit: 'ms',
    earth: [180, 320],
    bad: 'high',
    sdFloor: 8,
    adapt: (d) => 8 * sat(d, 15),
    hazard: 'isolation',
    behavioral: true,
    digits: 0,
  },
  lymph: {
    id: 'lymph',
    unit: '×10⁹/L',
    earth: [1.0, 4.0],
    bad: 'low',
    sdFloor: 0.12,
    adapt: (d) => -0.1 * sat(d, 30),
    hazard: 'environment',
    behavioral: false,
    digits: 2,
  },
  bodyMass: {
    id: 'bodyMass',
    unit: 'kg',
    earth: [0, 999], // no universal Earth range for body mass; twin-only metric
    bad: 'low',
    sdFloor: 0.4,
    adapt: (d, b) => -0.02 * b * sat(d, 45),
    hazard: 'gravity',
    behavioral: false,
    digits: 1,
  },
  // --- Added for the challenge's core vital signs. Modeled assumptions. ---
  tempC: {
    id: 'tempC',
    unit: '°C',
    earth: [36.1, 37.5],
    bad: 'both',
    sdFloor: 0.15,
    adapt: (d) => 0.2 * sat(d, 30),
    hazard: 'environment',
    behavioral: false,
    digits: 1,
  },
  glucose: {
    id: 'glucose',
    unit: 'mg/dL',
    earth: [70, 100],
    bad: 'both',
    sdFloor: 4,
    adapt: (d) => 3 * sat(d, 40),
    hazard: 'gravity',
    behavioral: false,
    digits: 0,
  },
  spo2: {
    id: 'spo2',
    unit: '%',
    earth: [95, 100],
    bad: 'low',
    sdFloor: 0.7,
    adapt: () => 0,
    hazard: 'environment',
    behavioral: false,
    digits: 0,
  },
  sysBp: {
    id: 'sysBp',
    unit: 'mmHg',
    earth: [90, 130],
    bad: 'both',
    sdFloor: 4,
    adapt: (d) => -4 * sat(d, 20),
    hazard: 'gravity',
    behavioral: false,
    digits: 0,
  },
  mskIndex: {
    id: 'mskIndex',
    unit: 'idx',
    earth: [0, 999], // no Earth range: index is relative to the person's pre-flight self
    bad: 'low',
    sdFloor: 1.2,
    adapt: (d) => -4 * sat(d, 60),
    hazard: 'gravity',
    behavioral: false,
    digits: 0,
  },
}

export const METRIC_IDS = Object.keys(METRICS) as MetricId[]

// --- Radiation dose models -------------------------------------------------
// Curiosity RAD cruise ≈ 1.84 mSv/day; Chang'e-4 LND lunar surface ≈ 1.37 mSv/day;
// LEO value is a typical ISS-class figure. NASA-STD-3001 career limit 600 mSv.
export const DOSE_RATE_MSV_PER_DAY: Record<MissionProfileId, number> = {
  leo: 0.6,
  moon: 1.37,
  mars: 1.84,
}
export const CAREER_LIMIT_MSV = 600
/** CSA: neutrons contribute roughly 30% of the ISS radiation exposure. */
export const NEUTRON_FRACTION = 0.3
/** Modeled, illustrative extra dose for an unsheltered EVA during a GLE-class SEP. */
export const SEP_EVA_DOSE_MSV = 8
export const SEP_SHELTERED_DOSE_MSV = 1.2

/** Cabin ppCO2 threshold (mmHg) treated as "elevated" by the rule engine. */
export const CO2_ELEVATED_MMHG = 3.0

// --- Deterministic pseudo-random noise ------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-9)
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const round = (v: number, digits: number) => {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

interface Person {
  id: string
  name: string
  role: { en: string; tr: string }
  age: number
  base: { restHr: number; hrv: number; sleepH: number; pvtMs: number; lymph: number; bodyMass: number }
  /** Baselines for the vital signs added later (kept separate so the original series are unchanged). */
  vitals: { tempC: number; glucose: number; spo2: number; sysBp: number; mskIndex: number }
}

// Fictional crew. Any resemblance to real astronauts is unintended.
const PEOPLE: Person[] = [
  {
    id: 'cdr',
    name: 'Aylin Demir',
    role: { en: 'Commander', tr: 'Komutan' },
    age: 44,
    base: { restHr: 58, hrv: 66, sleepH: 7.3, pvtMs: 245, lymph: 2.1, bodyMass: 64 },
    vitals: { tempC: 36.7, glucose: 86, spo2: 98, sysBp: 112, mskIndex: 100 },
  },
  {
    id: 'plt',
    name: 'Kenji Mori',
    role: { en: 'Pilot', tr: 'Pilot' },
    age: 39,
    base: { restHr: 61, hrv: 62, sleepH: 7.2, pvtMs: 250, lymph: 1.9, bodyMass: 76 },
    vitals: { tempC: 36.6, glucose: 90, spo2: 98, sysBp: 118, mskIndex: 100 },
  },
  {
    id: 'ms1',
    name: 'Lucas Ferreira',
    role: { en: 'Mission Specialist', tr: 'Görev Uzmanı' },
    age: 36,
    base: { restHr: 56, hrv: 71, sleepH: 7.5, pvtMs: 238, lymph: 1.85, bodyMass: 81 },
    vitals: { tempC: 36.8, glucose: 88, spo2: 97, sysBp: 121, mskIndex: 100 },
  },
  {
    id: 'ms2',
    name: 'Nia Okafor',
    role: { en: 'Flight Engineer', tr: 'Uçuş Mühendisi' },
    age: 41,
    base: { restHr: 60, hrv: 59, sleepH: 7.0, pvtMs: 256, lymph: 2.3, bodyMass: 68 },
    vitals: { tempC: 36.7, glucose: 84, spo2: 98, sysBp: 114, mskIndex: 100 },
  },
]

const FOCUS: Record<ScenarioId, string> = {
  nominal: 'cdr',
  hidden: 'plt',
  storm: 'ms1',
  immune: 'ms2',
}

const SCENARIO_SEED: Record<ScenarioId, number> = {
  nominal: 11,
  hidden: 23,
  storm: 37,
  immune: 51,
}

/**
 * Build the simulated mission for a scenario.
 * - nominal: everyone tracks their expected space trajectory.
 * - hidden : the pilot slowly declines from day 15 (sleep, PVT, HRV) while the
 *            cabin CO₂ creeps up from day 28 — yet he keeps reporting "I'm fine".
 * - storm  : nominal crew; on the current day a mission specialist is on EVA
 *            when a solar particle event starts (GLE74, 11 May 2024 replay).
 * - immune : sustained stress + falling lymphocytes + rash (latent virus reactivation).
 */
export function buildMission(
  scenario: ScenarioId,
  profile: MissionProfileId = 'mars',
  today: number = SCENARIO_TODAY,
): Mission {
  const focusId = FOCUS[scenario]
  const doseRate = DOSE_RATE_MSV_PER_DAY[profile]
  const envRand = mulberry32(SCENARIO_SEED[scenario] * 7919)
  const co2ByDay: number[] = []
  for (let day = 1; day <= today; day++) {
    let co2 = 2.4 + 0.12 * gaussian(envRand)
    if (scenario === 'hidden' && day >= 28) co2 = 2.4 + Math.min(1.1, (day - 27) * 0.14) + 0.08 * gaussian(envRand)
    co2ByDay.push(round(Math.max(1.6, co2), 2))
  }

  const crew: CrewMember[] = PEOPLE.map((p, idx) => {
    const rand = mulberry32(SCENARIO_SEED[scenario] * 1000 + idx * 97 + 5)
    // Separate stream for the later-added vitals: the original series stay bit-identical.
    const rand2 = mulberry32(SCENARIO_SEED[scenario] * 3331 + idx * 53 + 9)
    const isFocus = p.id === focusId
    const days: DayRecord[] = []
    for (let day = 1; day <= today; day++) {
      const drift = Math.max(0, day - BASELINE_DAYS) // days since the baseline window closed
      const m = (id: keyof Person['base'], noise: number) =>
        p.base[id] + METRICS[id].adapt(day, p.base[id]) + noise * gaussian(rand)

      let restHr = m('restHr', 1.6)
      let hrv = m('hrv', 2.6)
      let sleepH = m('sleepH', 0.22)
      let pvtMs = m('pvtMs', 5.5)
      let lymph = m('lymph', 0.08)
      const bodyMass = m('bodyMass', 0.25)
      const v = (id: keyof Person['vitals'], noise: number) =>
        p.vitals[id] + METRICS[id].adapt(day, p.vitals[id]) + noise * gaussian(rand2)
      let tempC = v('tempC', 0.1)
      let glucose = v('glucose', 2.8)
      const spo2 = v('spo2', 0.45)
      let sysBp = v('sysBp', 2.8)
      let mskIndex = v('mskIndex', 0.8)
      let mood = 4
      let stress = 2
      let feelsFine = true
      let rash = false
      let headache = false
      const visionChange = false
      let eva = false
      const sepActive = false
      let doseMsv = doseRate * (1 + 0.05 * gaussian(rand))
      let exerciseMin = 120 + 8 * gaussian(rand)

      if (scenario === 'hidden' && isFocus) {
        // Slow, in-range decline. The person never complains.
        sleepH -= 0.07 * drift
        pvtMs += 3.0 * drift
        hrv -= 0.7 * drift
        restHr += 0.35 * drift
        exerciseMin -= 1.2 * drift
        headache = day >= 37
        // Sleep loss and less exercise show up metabolically too.
        glucose += 0.5 * drift
        sysBp += 0.3 * drift
        mskIndex -= 0.18 * drift
      }

      if (scenario === 'immune' && isFocus) {
        lymph -= 0.055 * drift
        if (day >= 20) {
          stress = day >= 26 ? 5 : 4
          mood = 3
          sleepH -= 0.4
        }
        rash = day >= 37
        // Low-grade temperature rise ahead of the rash.
        if (day >= 33) tempC += 0.11 * (day - 32)
        feelsFine = day < 37
      }

      if (scenario === 'storm' && day === today) {
        // EVA team: the mission specialist is outside; others are inside.
        // The SEP dose itself is added by applySepDose() once the event is active.
        eva = isFocus
      }

      days.push({
        day,
        restHr: round(restHr, 0),
        hrv: round(hrv, 0),
        sleepH: round(Math.max(3, sleepH), 1),
        pvtMs: round(pvtMs, 0),
        lymph: round(Math.max(0.3, lymph), 2),
        bodyMass: round(bodyMass, 1),
        tempC: round(tempC, 1),
        glucose: round(glucose, 0),
        spo2: Math.min(100, round(spo2, 0)),
        sysBp: round(sysBp, 0),
        mskIndex: round(mskIndex, 0),
        exerciseMin: round(Math.max(20, exerciseMin), 0),
        co2: co2ByDay[day - 1],
        doseMsv: round(doseMsv, 2),
        mood,
        stress,
        feelsFine,
        rash,
        headache,
        visionChange,
        eva,
        sepActive,
      })
    }
    return { id: p.id, name: p.name, role: p.role, age: p.age, days }
  })

  return { scenario, today, crew, focusId }
}

/**
 * Add the modeled (illustrative) SEP dose to today's record once a solar
 * particle event is active: unsheltered EVA crew receive far more than crew inside.
 */
export function applySepDose(mission: Mission): Mission {
  return {
    ...mission,
    crew: mission.crew.map((c) => ({
      ...c,
      days: c.days.map((d) =>
        d.day === mission.today
          ? { ...d, doseMsv: round(d.doseMsv + (d.eva ? SEP_EVA_DOSE_MSV : SEP_SHELTERED_DOSE_MSV), 2) }
          : d,
      ),
    })),
  }
}

/** Patch today's record of one crew member (daily check-in input). */
export function applyDailyCheck(
  mission: Mission,
  crewId: string,
  patch: Partial<DayRecord>,
): Mission {
  return {
    ...mission,
    crew: mission.crew.map((c) =>
      c.id !== crewId
        ? c
        : {
            ...c,
            days: c.days.map((d) => (d.day === mission.today ? { ...d, ...patch, day: d.day } : d)),
          },
    ),
  }
}
