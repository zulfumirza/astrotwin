// Gemini narrator via /api/narrate. The LLM only re-words findings that the
// rule engine already computed. If it is unreachable, slow, off-schema or
// changes a number, we silently fall back to the deterministic template and
// the app keeps working fully offline.
import {
  isValidSbar,
  numbersAreGrounded,
  templateSbar,
  type ReportPayload,
} from '../engine/sbar'
import type { Sbar } from '../engine/types'
import { fetchJson, type Sourced } from './http'

// Ask the backend once whether a narrator key is configured, so an unconfigured
// (or offline) app does not fire a doomed request on every screen.
let narratorReady: Promise<boolean> | null = null
const isNarratorReady = () =>
  (narratorReady ??= fetchJson<{ narrator?: boolean }>('/api/health', {}, 5_000)
    .then((h) => Boolean(h.narrator))
    .catch(() => {
      narratorReady = null // offline now; try again next time
      return false
    }))

export async function narrate(payload: ReportPayload): Promise<Sourced<Sbar>> {
  try {
    if (!(await isNarratorReady())) throw new Error('narrator unavailable')
    const res = await fetchJson<{ sbar: unknown; fallback?: string }>(
      '/api/narrate',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // `payload` already has the crew privacy choice applied (buildPayload):
        // withheld behavioural data never leaves the vehicle app.
        body: JSON.stringify({ payload }),
      },
      20_000,
    )
    // Validate again on the client: never trust narrated text blindly.
    if (!isValidSbar(res.sbar) || !numbersAreGrounded(res.sbar, payload)) throw new Error('rejected')
    return { data: res.sbar, source: 'live', fetchedAt: Date.now() }
  } catch {
    return { data: templateSbar(payload), source: 'embedded' }
  }
}
