// NASA DONKI space-weather events (SEP, FLR, CME, notifications) via /api/donki.
import {
  EMBEDDED_RECENT_EVENTS,
  GLE74_EVENTS,
  type SpaceWeatherEvent,
} from '../engine/radiation'
import { fetchJson, withFallback, type Sourced } from './http'

interface DonkiResponse {
  events: SpaceWeatherEvent[]
  /** DONKI endpoints that failed upstream for this request (e.g. ["FLR"]). */
  partial?: string[]
}

const load = (range: 'recent' | 'gle74') => async () => {
  const res = await fetchJson<DonkiResponse>(`/api/donki?range=${range}`, {}, 25_000)
  if (!Array.isArray(res.events)) throw new Error('bad shape')
  let events = res.events
  // If DONKI's flare endpoint is down, keep the replay complete by adding the
  // embedded flare entry (clearly marked) to the live SEP/CME list.
  if (range === 'gle74' && !events.some((e) => e.type === 'FLR')) {
    const flare = GLE74_EVENTS.find((e) => e.type === 'FLR')!
    events = [...events, { ...flare, title: `${flare.title} · embedded` }].sort((a, b) =>
      b.time.localeCompare(a.time),
    )
  }
  return events
}

/** Last 30 days of events for the Radiation panel. */
export const getRecentEvents = (): Promise<Sourced<SpaceWeatherEvent[]>> =>
  withFallback('donki:recent', load('recent'), () => EMBEDDED_RECENT_EVENTS)

/** 2024-05-10 … 2024-05-12: the GLE74 window, replayed in the Solar storm scenario. */
export const getGle74Events = (): Promise<Sourced<SpaceWeatherEvent[]>> =>
  withFallback('donki:gle74', load('gle74'), () => [...GLE74_EVENTS].reverse())
