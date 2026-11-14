// AI reflection on the free-text note, via /api/reflect. Validated again on the
// client; any failure keeps the offline keyword evaluation.
import { aiNoteIsSafe, aiNoteNumbersGrounded, parseAiNote, type AiNoteResult } from '../engine/note'
import type { Lang } from '../engine/types'
import { fetchJson } from './http'

export async function reflectNote(note: string, lang: Lang): Promise<AiNoteResult | null> {
  try {
    const res = await fetchJson<{ result: unknown }>(
      '/api/reflect',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note, lang }) },
      20_000,
    )
    const r = parseAiNote(res.result)
    if (!r || !aiNoteNumbersGrounded(r, note) || !aiNoteIsSafe(r)) return null
    return r
  } catch {
    return null
  }
}
