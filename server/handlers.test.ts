import { afterEach, describe, expect, it, vi } from 'vitest'
import { assess, buildMission, buildPayload, templateSbar } from '../src/engine'
import { handleApi } from './handlers'

const mission = buildMission('hidden')
const a = assess(mission.crew.find((c) => c.id === 'plt')!, { profile: 'mars', delaySec: 660 })
const payload = buildPayload(a, { shareBehavioral: true }, 'en')

const geminiReply = (obj: unknown) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('/api/narrate — the LLM is only a narrator', () => {
  it('answers with no narration (sbar: null) without a key, so the client uses the offline template', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    const res = await handleApi('narrate', {}, { payload })
    expect(res.status).toBe(200)
    expect((res.body as any).sbar).toBeNull()
  })

  it('accepts schema-valid, number-faithful narration', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    const fetchMock = vi.fn(async () => geminiReply(templateSbar(payload)))
    vi.stubGlobal('fetch', fetchMock)
    const res = await handleApi('narrate', {}, { payload })
    expect(res.status).toBe(200)
    expect((res.body as any).sbar.situation).toContain('Kenji Mori')
    // The key travels in a header to Google only — never in the URL.
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).not.toContain('test-key')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key')
  })

  it('rejects narration that changes a number', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    const forged = { ...templateSbar(payload), assessment: 'Reaction time is only 201 ms. Readiness 97/100.' }
    vi.stubGlobal('fetch', vi.fn(async () => geminiReply(forged)))
    const res = await handleApi('narrate', {}, { payload: { ...payload, day: 41 } })
    expect(res.status).toBe(200)
    expect((res.body as any).sbar).toBeNull()
    expect((res.body as any).fallback).toBe('narrator-numbers-rejected')
  })

  it('rejects narration that breaks the schema', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn(async () => geminiReply({ situation: 'only one field' })))
    const res = await handleApi('narrate', {}, { payload: { ...payload, day: 42 } })
    expect(res.status).toBe(200)
    expect((res.body as any).sbar).toBeNull()
    expect((res.body as any).fallback).toBe('narrator-schema-rejected')
  })

  it('rejects a malformed payload', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    expect((await handleApi('narrate', {}, { payload: { hello: 1 } })).status).toBe(400)
  })
})

describe('upstream failures', () => {
  it('returns 502 (never a crash) when an upstream API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect((await handleApi('swpc', {}, null)).status).toBe(502)
    expect((await handleApi('horizons', {}, null)).status).toBe(502)
    expect((await handleApi('donki', { range: 'recent' }, null)).status).toBe(502)
  })
})
