import { stableContext } from '@/lib/stable-context'
// App state: scenario, crew selection, privacy, live space-weather signals,
// daily check-ins and the delayed report queue. All scoring is delegated to
// the pure engine (src/engine); this file only wires data into it.
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  applyDailyCheck,
  applySepDose,
  assessMission,
  auToDelaySec,
  buildMission,
  buildPayload,
  checkinStatus,
  NO_CHECKS,
  earthMarsDistanceAu,
  FIXED_DELAY_SEC,
  isSepActive,
  replaySepActive,
  templateSbar,
  worstTier,
  type Assessment,
  type CheckinDone,
  type CheckinStatus,
  type CheckKind,
  type DayRecord,
  type Lang,
  type Mission,
  type MissionProfileId,
  type PrivacySettings,
  type ProtonPoint,
  type ScenarioId,
  type Sbar,
  type SpaceWeatherEvent,
  type Tier,
} from '../engine'
import { useI18n } from '../i18n'
import { getGle74Events, getRecentEvents } from '../services/donki'
import { getMarsRange, type MarsRange } from '../services/horizons'
import type { DataSource, Sourced } from '../services/http'
import { getProtonFlux } from '../services/swpc'

export interface Report {
  id: string
  crewId: string
  name: string
  day: number
  tier: Tier
  sbar: Sbar
  narrator: DataSource
  lang: Lang
  sentAt: number
  delaySec: number
  withheld: number
  auto: boolean
}

interface MissionState {
  scenario: ScenarioId
  setScenario: (s: ScenarioId) => void
  profile: MissionProfileId
  setProfile: (p: MissionProfileId) => void
  mission: Mission
  assessments: Assessment[]
  current: Assessment
  selectedId: string
  setSelectedId: (id: string) => void
  missionTier: Tier
  privacy: PrivacySettings
  setPrivacy: (p: PrivacySettings) => void
  delaySec: number
  marsRange: Sourced<MarsRange>
  protons: Sourced<ProtonPoint[]> | null
  recentEvents: Sourced<SpaceWeatherEvent[]> | null
  gleEvents: Sourced<SpaceWeatherEvent[]> | null
  liveSep: boolean
  sepActive: boolean
  stormClock: string
  setStormClock: (iso: string) => void
  refreshSpaceWeather: () => void
  submitCheck: (crewId: string, patch: Partial<DayRecord>, kind: CheckKind) => void
  /** Checks completed today by this crew member (drives the streak and badges). */
  checkinFor: (crewId: string) => CheckinStatus
  reports: Report[]
  sendReport: (r: Omit<Report, 'id' | 'sentAt' | 'delaySec'>) => void
  fastForward: boolean
  setFastForward: (v: boolean) => void
  /** Milliseconds until a report reaches Earth (0 = received). */
  transitLeftMs: (r: Report, now: number) => number
}

const Ctx = stableContext<MissionState | null>('mission', null)
export const DEFAULT_STORM_CLOCK = '2024-05-11T02:00:00Z'
export const FAST_FORWARD = 60

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function MissionProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n()
  // "Hidden decline" is the opening scenario.
  const [scenario, setScenarioState] = useState<ScenarioId>('hidden')
  const [profile, setProfile] = useState<MissionProfileId>('mars')
  const [privacy, setPrivacyState] = useState<PrivacySettings>(() =>
    readJson('astrotwin:privacy', { shareBehavioral: false }),
  )
  const [checks, setChecks] = useState<Record<string, Partial<DayRecord>>>({})
  const [done, setDone] = useState<Record<string, CheckinDone>>({})
  const [stormClock, setStormClock] = useState(DEFAULT_STORM_CLOCK)
  const [reports, setReports] = useState<Report[]>([])
  const [fastForward, setFastForward] = useState(false)

  const [marsRange, setMarsRange] = useState<Sourced<MarsRange>>(() => ({
    data: { au: earthMarsDistanceAu(new Date()) },
    source: 'embedded',
  }))
  const [protons, setProtons] = useState<Sourced<ProtonPoint[]> | null>(null)
  const [recentEvents, setRecentEvents] = useState<Sourced<SpaceWeatherEvent[]> | null>(null)
  const [gleEvents, setGleEvents] = useState<Sourced<SpaceWeatherEvent[]> | null>(null)

  const refreshSpaceWeather = useCallback(() => {
    getProtonFlux().then(setProtons)
    getRecentEvents().then(setRecentEvents)
  }, [])

  useEffect(() => {
    refreshSpaceWeather()
    getMarsRange().then(setMarsRange)
    getGle74Events().then(setGleEvents)
    const timer = window.setInterval(() => getProtonFlux().then(setProtons), 5 * 60_000)
    return () => window.clearInterval(timer)
  }, [refreshSpaceWeather])

  const base = useMemo(() => buildMission(scenario, profile), [scenario, profile])
  const [selectedId, setSelectedId] = useState(base.focusId)

  const setScenario = useCallback((s: ScenarioId) => {
    setScenarioState(s)
    setSelectedId(buildMission(s).focusId)
    setStormClock(DEFAULT_STORM_CLOCK)
  }, [])

  const delaySec = profile === 'mars' ? auToDelaySec(marsRange.data.au) : FIXED_DELAY_SEC[profile]
  // Only a LIVE reading may raise the storm flag; cached/embedded flux never does.
  const liveSep = Boolean(protons && protons.source === 'live' && isSepActive(protons.data))
  const sepActive = liveSep || (scenario === 'storm' && replaySepActive(stormClock))

  const mission = useMemo(() => {
    let m = sepActive ? applySepDose(base) : base
    for (const c of base.crew) {
      const patch = checks[`${scenario}:${c.id}`]
      if (patch) m = applyDailyCheck(m, c.id, patch)
    }
    return m
  }, [base, checks, scenario, sepActive])

  const assessments = useMemo(
    () => assessMission(mission, { profile, delaySec, sepActive }),
    [mission, profile, delaySec, sepActive],
  )
  const current = assessments.find((a) => a.crewId === selectedId) ?? assessments[0]
  const missionTier = worstTier(assessments)

  const setPrivacy = useCallback((p: PrivacySettings) => {
    setPrivacyState(p)
    try {
      localStorage.setItem('astrotwin:privacy', JSON.stringify(p))
    } catch {
      /* ignore */
    }
  }, [])

  const submitCheck = useCallback(
    (crewId: string, patch: Partial<DayRecord>, kind: CheckKind) => {
      const key = `${scenario}:${crewId}`
      setChecks((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
      setDone((prev) => ({ ...prev, [key]: { ...NO_CHECKS, ...prev[key], [kind]: true } }))
    },
    [scenario],
  )
  const checkinFor = useCallback(
    (crewId: string) => checkinStatus(crewId, done[`${scenario}:${crewId}`] ?? NO_CHECKS),
    [done, scenario],
  )

  const delayRef = useRef(delaySec)
  delayRef.current = delaySec
  const sendReport = useCallback((r: Omit<Report, 'id' | 'sentAt' | 'delaySec'>) => {
    setReports((prev) => [
      {
        ...r,
        id: `${Date.now()}-${prev.length}`,
        sentAt: Date.now(),
        delaySec: delayRef.current,
      },
      ...prev,
    ])
  }, [])

  // Tiered reporting: CRITICAL findings are transmitted immediately and in
  // full, without waiting for the astronaut or the narrator (template text).
  const autoSent = useRef(new Set<string>())
  useEffect(() => {
    for (const a of assessments) {
      if (a.tier !== 'critical') continue
      const key = `${scenario}:${profile}:${a.crewId}:${a.findings.filter((f) => f.level === 'critical').map((f) => f.id).join('+')}`
      if (autoSent.current.has(key)) continue
      autoSent.current.add(key)
      const payload = buildPayload(a, privacy, lang)
      sendReport({
        crewId: a.crewId,
        name: a.name,
        day: a.day,
        tier: a.tier,
        sbar: templateSbar(payload),
        narrator: 'embedded',
        lang,
        withheld: payload.withheld,
        auto: true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessments])

  const transitLeftMs = useCallback(
    (r: Report, now: number) => {
      const elapsed = (now - r.sentAt) * (fastForward ? FAST_FORWARD : 1)
      return Math.max(0, r.delaySec * 1000 - elapsed)
    },
    [fastForward],
  )

  const value: MissionState = {
    scenario,
    setScenario,
    profile,
    setProfile,
    mission,
    assessments,
    current,
    selectedId: current.crewId,
    setSelectedId,
    missionTier,
    privacy,
    setPrivacy,
    delaySec,
    marsRange,
    protons,
    recentEvents,
    gleEvents,
    liveSep,
    sepActive,
    stormClock,
    setStormClock,
    refreshSpaceWeather,
    submitCheck,
    checkinFor,
    reports,
    sendReport,
    fastForward,
    setFastForward,
    transitLeftMs,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMission() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMission must be used within MissionProvider')
  return ctx
}

/** Ticks once per second while mounted (countdowns). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
