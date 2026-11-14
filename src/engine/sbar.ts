// Report payload (with privacy applied) and the template-based SBAR writer.
// The SAME payload feeds (a) the offline template below and (b) the optional
// LLM narrator, so privacy is enforced in exactly one place: buildPayload().

import {
  findingText,
  HAZARD_NAMES,
  LEVEL_NAMES,
  TIER_NAMES,
} from '../i18n/findings'
import { formatDelay } from './delay'
import type {
  Assessment,
  HazardId,
  Lang,
  Level,
  MissionProfileId,
  PrivacySettings,
  Sbar,
  Tier,
} from './types'

export interface PayloadFinding {
  id: string
  level: Level
  hazard: HazardId
  title: string
  what: string
  why: string
  action: string
  source: string
}

export interface ReportPayload {
  lang: Lang
  crew: string
  day: number
  tier: Tier
  score: number
  profile: MissionProfileId
  delaySec: number
  /** One-way delay as shown to humans, e.g. "11 min 01 s". */
  delayText: string
  hazards: Array<{ id: HazardId; name: string; score: number; level: Level }>
  findings: PayloadFinding[]
  vitals: {
    restHr: number
    hrv: number
    sleepH: number
    lymph: number
    co2: number
    cumulativeDoseMsv: number
  }
  /** Present only when the crew shares it, or when the tier is critical. */
  behavioral?: { mood: number; stress: number; feelsFine: boolean; pvtMs: number }
  /** Number of behavioural findings withheld by the crew privacy setting. */
  withheld: number
  privacyApplied: boolean
}

/** Critical thresholds are always shared in full; otherwise the crew decides. */
export function buildPayload(
  a: Assessment,
  privacy: PrivacySettings,
  lang: Lang,
): ReportPayload {
  const full = a.tier === 'critical' || privacy.shareBehavioral
  const visible = full ? a.findings : a.findings.filter((f) => !f.behavioral)
  return {
    lang,
    crew: a.name,
    day: a.day,
    tier: a.tier,
    score: a.score,
    profile: a.profile,
    // Rounded so the narrator can quote it verbatim (it may not alter numbers).
    delaySec: a.delaySec >= 10 ? Math.round(a.delaySec) : Number(a.delaySec.toFixed(2)),
    delayText: formatDelay(a.delaySec),
    hazards: a.hazards.map((h) => ({ ...h, name: HAZARD_NAMES[lang][h.id] })),
    findings: visible.map((f) => ({
      id: f.id,
      level: f.level,
      hazard: f.hazard,
      ...findingText(f, lang),
      source: f.sourceUrl,
    })),
    vitals: {
      restHr: a.record.restHr,
      hrv: a.record.hrv,
      sleepH: a.record.sleepH,
      lymph: a.record.lymph,
      co2: Math.round(a.co2Avg3 * 10) / 10,
      cumulativeDoseMsv: Math.round(a.cumulativeDoseMsv),
    },
    behavioral: full
      ? {
          mood: a.record.mood,
          stress: a.record.stress,
          feelsFine: a.record.feelsFine,
          pvtMs: a.record.pvtMs,
        }
      : undefined,
    withheld: a.findings.length - visible.length,
    privacyApplied: !full,
  }
}

const PROFILE_NAMES: Record<Lang, Record<MissionProfileId, string>> = {
  en: { leo: 'low Earth orbit', moon: 'lunar mission', mars: 'Mars transit' },
  tr: { leo: 'alçak Dünya yörüngesi', moon: 'Ay görevi', mars: 'Mars yolculuğu' },
}

/** Deterministic, offline SBAR. Also the fallback when the LLM is unreachable. */
export function templateSbar(p: ReportPayload): Sbar {
  const L = p.lang
  const tier = TIER_NAMES[L][p.tier].toUpperCase()
  const top = p.findings.slice(0, 3)
  const delay = formatDelay(p.delaySec)
  const worst = [...p.hazards].sort((a, b) => a.score - b.score)[0]

  if (L === 'tr') {
    const withheld = p.withheld
      ? ` Mürettebat gizlilik tercihi gereği ${p.withheld} davranışsal bulgu paylaşılmadı.`
      : ''
    return {
      situation: top.length
        ? `${p.crew}, görev günü ${p.day}. Rapor kademesi: ${tier}. Öne çıkan: ${top.map((f) => f.title).join('; ')}.`
        : `${p.crew}, görev günü ${p.day}. Rapor kademesi: ${tier}. Tüm göstergeler kişisel beklenen uzay yörüngesinde.`,
      background: `Profil: ${PROFILE_NAMES.tr[p.profile]}. Tek yön sinyal gecikmesi ${delay}. Kişisel baseline uçuşun 1–14. günlerinden. Birikimli doz ${p.vitals.cumulativeDoseMsv} mSv. Kabin CO₂ ${p.vitals.co2} mmHg.`,
      assessment:
        (p.findings.length
          ? p.findings.map((f) => `[${LEVEL_NAMES.tr[f.level]}] ${f.what}`).join(' ')
          : 'Sapma yok.') +
        ` Genel hazırlık puanı ${p.score}/100; en düşük alan: ${worst.name} (${worst.score}).` +
        withheld,
      recommendation: p.findings.length
        ? unique(p.findings.map((f) => f.action)).slice(0, 4).join(' ')
        : 'Rutin izleme sürsün. Yer ekibinden eylem beklenmiyor.',
      crewMessage: top.length
        ? `${firstName(p.crew)}, ${top[0].what} ${top[0].why} ${top[0].action}`
        : `${firstName(p.crew)}, bugün tüm göstergelerin kendi beklenen uzay yörüngende. Böyle devam.`,
    }
  }

  const withheld = p.withheld
    ? ` ${p.withheld} behavioural finding(s) withheld by crew privacy setting.`
    : ''
  return {
    situation: top.length
      ? `${p.crew}, mission day ${p.day}. Report tier: ${tier}. Leading: ${top.map((f) => f.title).join('; ')}.`
      : `${p.crew}, mission day ${p.day}. Report tier: ${tier}. All indicators on the personal expected space trajectory.`,
    background: `Profile: ${PROFILE_NAMES.en[p.profile]}. One-way signal delay ${delay}. Personal baseline from flight days 1–14. Cumulative dose ${p.vitals.cumulativeDoseMsv} mSv. Cabin CO₂ ${p.vitals.co2} mmHg.`,
    assessment:
      (p.findings.length
        ? p.findings.map((f) => `[${LEVEL_NAMES.en[f.level]}] ${f.what}`).join(' ')
        : 'No deviations.') +
      ` Overall readiness ${p.score}/100; lowest area: ${worst.name} (${worst.score}).` +
      withheld,
    recommendation: p.findings.length
      ? unique(p.findings.map((f) => f.action)).slice(0, 4).join(' ')
      : 'Continue routine monitoring. No ground action requested.',
    crewMessage: top.length
      ? `${firstName(p.crew)}, ${lowerFirst(top[0].what)} ${top[0].why} ${top[0].action}`
      : `${firstName(p.crew)}, all your indicators are on your own expected space trajectory today. Keep it up.`,
  }
}

const unique = <T,>(xs: T[]) => [...new Set(xs)]
const firstName = (n: string) => n.split(' ')[0]
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s)

export const SBAR_KEYS = [
  'situation',
  'background',
  'assessment',
  'recommendation',
  'crewMessage',
] as const

/** Schema check for narrator output. Anything invalid → caller falls back to the template. */
export function isValidSbar(x: unknown): x is Sbar {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return SBAR_KEYS.every(
    (k) => typeof o[k] === 'string' && (o[k] as string).trim().length > 0 && (o[k] as string).length <= 1600,
  )
}

/**
 * Guard: the narrator may not introduce or alter numbers. Every numeric token
 * in the narrated text must already exist in the payload it was given.
 */
export function numbersAreGrounded(sbar: Sbar, payload: ReportPayload): boolean {
  const norm = (s: string) => s.replace(',', '.').replace(/\.0+$/, '')
  const tokens = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map(norm)
  const allowed = new Set(tokens(JSON.stringify(payload) + ' ' + formatDelay(payload.delaySec)))
  // Structural constants of the product, never clinical values.
  for (const n of ['1', '2', '3', '14', '100']) allowed.add(n)
  return SBAR_KEYS.every((k) => tokens(sbar[k]).every((t) => allowed.has(t)))
}
