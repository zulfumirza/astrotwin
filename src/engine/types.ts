// AstroTwin engine types. The engine is pure, deterministic TypeScript:
// no React, no network, no LLM. "We did not leave the medical decision to a black box."

export type Lang = 'en' | 'tr'
export type ScenarioId = 'nominal' | 'hidden' | 'storm' | 'immune'
/** Tiered reporting to Earth. */
export type Tier = 'routine' | 'anomaly' | 'critical'
export type Level = 'nominal' | 'watch' | 'alert' | 'critical'
/** The NASA HRP five hazards of human spaceflight. */
export type HazardId =
  | 'radiation'
  | 'isolation'
  | 'distance'
  | 'gravity'
  | 'environment'
export type MissionProfileId = 'leo' | 'moon' | 'mars'

/** Per-person metrics tracked with the three-layer normal. */
export type MetricId =
  | 'restHr'
  | 'hrv'
  | 'sleepH'
  | 'pvtMs'
  | 'lymph'
  | 'bodyMass'
  | 'tempC'
  | 'glucose'
  | 'spo2'
  | 'sysBp'
  | 'diaBp'
  | 'mskIndex'
  | 'exerciseMin'

export interface DayRecord {
  day: number
  restHr: number
  hrv: number
  sleepH: number
  pvtMs: number
  lymph: number
  bodyMass: number
  /** Core body temperature, °C. */
  tempC: number
  /** Fasting blood glucose, mg/dL. */
  glucose: number
  /** Blood oxygen saturation, %. */
  spo2: number
  /** Systolic blood pressure, mmHg. */
  sysBp: number
  /** Diastolic blood pressure, mmHg. */
  diaBp: number
  /** Simulated bone & muscle index, 100 = pre-flight. */
  mskIndex: number
  exerciseMin: number
  /** Cabin ppCO2 in mmHg (shared environment). */
  co2: number
  /** Absorbed-dose equivalent for the day, mSv. */
  doseMsv: number
  /** Self-reported, 1 (bad) – 5 (great). */
  mood: number
  /** Self-reported, 1 (calm) – 5 (very stressed). */
  stress: number
  /** Astronaut's own statement: "I'm fine". */
  feelsFine: boolean
  rash: boolean
  headache: boolean
  /** Amsler-grid self test or reported visual change. */
  visionChange: boolean
  /** Self-report: "eye or vision change" ticked in today's check-in. */
  eyeSymptom?: boolean
  /** Result of today's Vision Check, when one was done. */
  vision?: import('./vision').VisionOutcome
  /** Result of today's Go/No-Go and digit-span checks, when done. */
  cognition?: import('./cognition').CognitionOutcome
  eva: boolean
  sepActive: boolean
}

export interface CrewMember {
  id: string
  name: string
  role: { en: string; tr: string }
  age: number
  days: DayRecord[]
}

export interface Mission {
  scenario: ScenarioId
  /** Current mission day (1-based); days.length === today. */
  today: number
  crew: CrewMember[]
  /** Crew member the scenario is about (opened by default). */
  focusId: string
}

export interface Baseline {
  /** Mean of days 1–14 with the expected adaptation removed. */
  mean: number
  /** Day-to-day spread during days 1–14 (floored per metric). */
  sd: number
}

export interface MetricState {
  id: MetricId
  value: number
  baseline: Baseline
  /** Expected value today = baseline + space adaptation curve. */
  expected: number
  /** 3-day mean z-score against the expected space trajectory. */
  z: number
  /** z signed so that positive = unhealthy direction. */
  zBad: number
  deviant: boolean
  outsideEarth: boolean
  /** First day the Earth-range rule fires (3 consecutive days), if any. */
  earthAlarmDay: number | null
  /** First day the AstroTwin rule fires (3-day mean z ≥ 2), if any. */
  twinAlarmDay: number | null
  /** Absolute-limit level today (only for metrics with fixed vital-sign limits). */
  limitLevel: Level
  /** Overall level: personal trajectory (z), Earth range and absolute limits combined. */
  level: Level
}

export interface Finding {
  /** i18n key suffix, e.g. "rule.judgment" or "metric.pvtMs". */
  id: string
  kind: 'metric' | 'compound' | 'event'
  hazard: HazardId
  level: Level
  /** True when the finding reveals behavioural / self-reported detail. */
  behavioral: boolean
  params: Record<string, string | number>
  sourceUrl: string
}

export interface HazardState {
  id: HazardId
  score: number
  level: Level
}

export interface AssessContext {
  profile: MissionProfileId
  /** One-way light time in seconds. */
  delaySec: number
  /** External "SEP active" signal (live GOES ≥10 MeV ≥ 10 pfu, or replay). */
  sepActive?: boolean
}

export interface Assessment {
  crewId: string
  name: string
  day: number
  tier: Tier
  /** Overall readiness 0–100 (higher is better). */
  score: number
  hazards: HazardState[]
  metrics: Record<MetricId, MetricState>
  findings: Finding[]
  record: DayRecord
  sleepDebt7: number
  co2Avg3: number
  cumulativeDoseMsv: number
  careerLimitPct: number
  delaySec: number
  profile: MissionProfileId
}

export interface Sbar {
  situation: string
  background: string
  assessment: string
  recommendation: string
  crewMessage: string
}

export interface PrivacySettings {
  /** Share behavioural detail in routine/anomaly reports. Critical always shares. */
  shareBehavioral: boolean
}
