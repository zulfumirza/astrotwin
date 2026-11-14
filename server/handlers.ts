// Backend proxy for all external APIs. Keys never reach the browser.
// Every upstream call has a timeout and an in-memory cache. Framework-agnostic:
// server.ts (Express) is a thin adapter around handleApi().

import { isValidSbar, numbersAreGrounded, type ReportPayload } from '../src/engine/sbar'
import type { ProtonPoint, SpaceWeatherEvent } from '../src/engine/radiation'

export interface ApiResult {
  status: number
  body: unknown
}

// --- tiny TTL cache ----------------------------------------------------------
const cache = new Map<string, { at: number; value: unknown }>()
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<{ value: T; cachedAt: number; hit: boolean }> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return { value: hit.value as T, cachedAt: hit.at, hit: true }
  try {
    const value = await load()
    cache.set(key, { at: Date.now(), value })
    return { value, cachedAt: Date.now(), hit: false }
  } catch (err) {
    // Serve stale data rather than nothing when the upstream is down.
    if (hit) return { value: hit.value as T, cachedAt: hit.at, hit: true }
    throw err
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10_000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`)
    return res
  } finally {
    clearTimeout(timer)
  }
}
const getJson = async (url: string, timeoutMs?: number) =>
  (await fetchWithTimeout(url, {}, timeoutMs)).json() as Promise<any>

const isoDate = (d: Date) => d.toISOString().slice(0, 10)
const MIN = 60_000
const HOUR = 60 * MIN

// --- NASA DONKI ----------------------------------------------------------------
async function donki(range: string): Promise<ApiResult> {
  const key = process.env.NASA_API_KEY || 'DEMO_KEY'
  const gle = range === 'gle74'
  const start = gle ? '2024-05-10' : isoDate(new Date(Date.now() - 30 * 24 * HOUR))
  const end = gle ? '2024-05-12' : isoDate(new Date())
  const url = (kind: string, extra = '') =>
    `https://api.nasa.gov/DONKI/${kind}?startDate=${start}&endDate=${end}${extra}&api_key=${key}`

  const { value, cachedAt, hit } = await cached(`donki:${range}:${start}:${end}`, gle ? 24 * HOUR : 30 * MIN, async () => {
    const [sep, flr, cme, notes] = await Promise.allSettled([
      getJson(url('SEP')),
      getJson(url('FLR')),
      getJson(url('CME')),
      gle ? Promise.resolve([]) : getJson(url('notifications', '&type=all')),
    ])
    if ([sep, flr, cme].every((r) => r.status === 'rejected')) throw new Error('DONKI unreachable')
    const list = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [])
    const events: SpaceWeatherEvent[] = [
      ...list(sep).map((e: any) => ({
        id: String(e.sepID),
        type: 'SEP' as const,
        time: toIso(e.eventTime),
        title: `SEP — ${(e.instruments ?? []).map((i: any) => i.displayName).join(', ') || 'energetic particles'}`,
        link: e.link,
      })),
      ...list(flr).map((e: any) => ({
        id: String(e.flrID),
        type: 'FLR' as const,
        time: toIso(e.peakTime ?? e.beginTime),
        title: `${e.classType ?? ''} flare${e.activeRegionNum ? ` (AR ${e.activeRegionNum})` : ''}`.trim(),
        link: e.link,
      })),
      ...list(cme).map((e: any) => ({
        id: String(e.activityID),
        type: 'CME' as const,
        time: toIso(e.startTime),
        title: `CME${e.sourceLocation ? ` from ${e.sourceLocation}` : ''}`,
        link: e.link,
      })),
      ...list(notes).slice(-15).map((e: any) => ({
        id: String(e.messageID),
        type: 'NOTE' as const,
        time: toIso(e.messageIssueTime),
        title: `Notification: ${e.messageType}`,
        link: e.messageURL,
      })),
    ]
      .filter((e) => e.time)
      .sort((a, b) => b.time.localeCompare(a.time))
    const failed = [['SEP', sep], ['FLR', flr], ['CME', cme]].filter(([, r]) => (r as any).status === 'rejected').map(([k]) => k)
    return { events, partial: failed }
  })
  return { status: 200, body: { ...value, start, end, fetchedAt: cachedAt, serverCache: hit } }
}
const toIso = (t?: string) => {
  if (!t) return ''
  const d = new Date(/Z$/.test(t) && t.length === 17 ? t.replace('Z', ':00Z') : t)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

// --- NOAA SWPC GOES integral protons ------------------------------------------
// Verified 2026-11-14: /json/goes/primary/integral-protons-6-hour.json returns
// [{time_tag, satellite, flux, energy: ">=10 MeV" | ">=100 MeV" | ...}].
async function swpc(): Promise<ApiResult> {
  const { value, cachedAt, hit } = await cached('swpc', 5 * MIN, async () => {
    const rows = await getJson('https://services.swpc.noaa.gov/json/goes/primary/integral-protons-6-hour.json')
    if (!Array.isArray(rows)) throw new Error('Unexpected SWPC format')
    const byTime = new Map<string, ProtonPoint>()
    for (const r of rows) {
      if (typeof r?.time_tag !== 'string' || typeof r?.flux !== 'number') continue
      const p = byTime.get(r.time_tag) ?? { time: r.time_tag, p10: 0, p100: 0 }
      if (r.energy === '>=10 MeV') p.p10 = r.flux
      else if (r.energy === '>=100 MeV') p.p100 = r.flux
      else continue
      byTime.set(r.time_tag, p)
    }
    const points = [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time))
    if (points.length === 0) throw new Error('No proton data')
    return { points, satellite: rows[0]?.satellite ?? null }
  })
  return { status: 200, body: { ...value, fetchedAt: cachedAt, serverCache: hit } }
}

// --- JPL Horizons: Earth–Mars range ----------------------------------------------
async function horizons(): Promise<ApiResult> {
  const today = isoDate(new Date())
  const tomorrow = isoDate(new Date(Date.now() + 24 * HOUR))
  const { value, cachedAt, hit } = await cached(`horizons:${today}`, 24 * HOUR, async () => {
    const q = new URLSearchParams({
      format: 'json',
      COMMAND: "'499'", // Mars
      OBJ_DATA: "'NO'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'OBSERVER'",
      CENTER: "'500@399'", // geocenter
      START_TIME: `'${today}'`,
      STOP_TIME: `'${tomorrow}'`,
      STEP_SIZE: "'1 d'",
      QUANTITIES: "'20'", // observer range & range-rate
      CSV_FORMAT: "'YES'",
    })
    const data = await getJson(`https://ssd.jpl.nasa.gov/api/horizons.api?${q}`, 15_000)
    const text: string = data?.result ?? ''
    const block = text.split('$$SOE')[1]?.split('$$EOE')[0]
    const au = Number(block?.trim().split('\n')[0]?.split(',')[3])
    if (!Number.isFinite(au) || au <= 0) throw new Error('Could not parse Horizons range')
    return { au, date: today }
  })
  return { status: 200, body: { ...value, fetchedAt: cachedAt, serverCache: hit } }
}

// --- Gemini narrator -----------------------------------------------------------------
// The LLM is a NARRATOR only. It receives already-computed findings and may not
// change any score, threshold or tier. Output is schema-checked and every number
// is verified against the input; anything else is rejected (client uses template).
const SYSTEM_INSTRUCTION = `You are the narrator for AstroTwin, an onboard astronaut health monitor.
You receive a JSON object with findings that were ALREADY computed by a deterministic rule engine.
Rules you must follow:
- Rely ONLY on the findings and values in the input. Do not invent diagnoses, causes, findings or data.
- Never change, round, add or estimate numbers. Reuse numbers exactly as given. Do not change the tier, levels or scores.
- Frame every piece of medical advice as an "onboard protocol recommendation", not as a diagnosis or prescription.
- Write in the language given by "lang" ("en" = English, "tr" = Turkish).
- Be brief: each field at most 3 short sentences.
- situation/background/assessment/recommendation form an SBAR report for Mission Control.
- crewMessage speaks directly and calmly to the astronaut: what happened, why it matters, what to do.
- If "withheld" is greater than 0, state that behavioural details were withheld by crew privacy choice; do not guess them.
Return only JSON with the keys situation, background, assessment, recommendation, crewMessage.`

function looksLikePayload(p: any): p is ReportPayload {
  return (
    p && typeof p === 'object' && (p.lang === 'en' || p.lang === 'tr') &&
    typeof p.crew === 'string' && typeof p.tier === 'string' &&
    Array.isArray(p.findings) && Array.isArray(p.hazards) && JSON.stringify(p).length < 20_000
  )
}

const modelCooldown = new Map<string, number>()

async function narrate(body: any): Promise<ApiResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return { status: 503, body: { error: 'narrator-not-configured' } }
  const payload = body?.payload
  if (!looksLikePayload(payload)) return { status: 400, body: { error: 'invalid-payload' } }
  // Primary model first; if it is overloaded, slow or returns rejected text,
  // try the lighter fallback model before giving up (client then uses the template).
  const models = [
    ...new Set([
      process.env.GEMINI_MODEL || 'gemini-flash-latest',
      process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest',
    ]),
  ]
  const str = { type: 'STRING' }

  const callModel = async (model: string) => {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: { situation: str, background: str, assessment: str, recommendation: str, crewMessage: str },
              required: ['situation', 'background', 'assessment', 'recommendation', 'crewMessage'],
            },
          },
        }),
      },
      8_000,
    )
    const data: any = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? ''
    let sbar: unknown
    try {
      sbar = JSON.parse(text)
    } catch {
      throw new Error('narrator-invalid-json')
    }
    if (!isValidSbar(sbar)) throw new Error('narrator-schema-rejected')
    if (!numbersAreGrounded(sbar, payload)) throw new Error('narrator-numbers-rejected')
    return { sbar, model }
  }

  const { value, cachedAt, hit } = await cached(`narrate:${models.join(',')}:${JSON.stringify(payload)}`, 10 * MIN, async () => {
    let lastError: unknown = new Error('narrator-unavailable')
    for (const model of models) {
      // Skip a model that just failed upstream (overload/timeout) for 2 minutes,
      // so the crew is not kept waiting on it again.
      if ((modelCooldown.get(model) ?? 0) > Date.now() && model !== models[models.length - 1]) continue
      try {
        return await callModel(model)
      } catch (err) {
        lastError = err
        const msg = err instanceof Error ? err.message : ''
        if (!msg.startsWith('narrator-')) modelCooldown.set(model, Date.now() + 2 * MIN)
      }
    }
    throw lastError
  })
  return { status: 200, body: { ...value, fetchedAt: cachedAt, serverCache: hit } }
}

export async function handleApi(route: string, query: Record<string, string>, body: unknown): Promise<ApiResult> {
  try {
    switch (route) {
      case 'donki':
        return await donki(query.range === 'gle74' ? 'gle74' : 'recent')
      case 'swpc':
        return await swpc()
      case 'horizons':
        return await horizons()
      case 'narrate':
        return await narrate(body)
      case 'health':
        return { status: 200, body: { ok: true, narrator: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') } }
      default:
        return { status: 404, body: { error: 'unknown-route' } }
    }
  } catch (err) {
    // Never leak keys or upstream URLs to the client.
    const message = err instanceof Error ? err.message.replace(/api_key=[^&\s]+/g, 'api_key=***') : 'error'
    return { status: 502, body: { error: 'upstream-failed', message } }
  }
}
