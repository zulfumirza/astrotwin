import { describe, expect, it } from 'vitest'
import {
  aiNoteIsSafe,
  aiNoteNumbersGrounded,
  answerSpan,
  applyDailyCheck,
  assess,
  assessCognition,
  buildMission,
  buildPayload,
  evaluateNoteOffline,
  GNG_TRIALS,
  makeDigits,
  makeGngTrials,
  parseAiNote,
  scoreGng,
  startSpan,
  updateCognitionBaseline,
} from './index'

describe('Go / No-Go', () => {
  it('always has 20 trials with 5 no-go', () => {
    const t = makeGngTrials()
    expect(t).toHaveLength(GNG_TRIALS)
    expect(t.filter((k) => k === 'nogo')).toHaveLength(5)
  })
  it('counts impulse errors, lapses and mean reaction time', () => {
    const r = scoreGng([
      { kind: 'go', pressed: true, rtMs: 300 },
      { kind: 'go', pressed: true, rtMs: 400 },
      { kind: 'go', pressed: false },
      { kind: 'nogo', pressed: true, rtMs: 250 },
      { kind: 'nogo', pressed: false },
    ])
    expect(r).toEqual({ commission: 1, omission: 1, meanRtMs: 350 })
  })
})

describe('digit span', () => {
  const run = (answers: boolean[]) => answers.reduce(answerSpan, startSpan())
  it('grows by one digit per correct answer and allows one retry', () => {
    // 3 ✓, 4 ✓, 5 ✗ then ✓ on the retry, 6 ✗ ✗ → stop; longest correct = 5
    const s = run([true, true, false, true, false, false])
    expect(s.best).toBe(5)
    expect(s.done).toBe(true)
  })
  it('stops at 9 digits', () => {
    expect(run([true, true, true, true, true, true, true]).done).toBe(true)
    expect(run([true, true, true, true, true, true, true]).best).toBe(9)
  })
  it('makes digit lists without immediate repeats', () => {
    const d = makeDigits(9)
    expect(d).toHaveLength(9)
    for (let i = 1; i < d.length; i++) expect(d[i]).not.toBe(d[i - 1])
  })
})

describe('cognition rules (compared with yourself)', () => {
  const ok = { commission: 0, omission: 0, meanRtMs: 400 }
  it('makes the first run the baseline and stays nominal', () => {
    const o = assessCognition({ span: 6, gng: ok })
    expect(o.level).toBe('nominal')
    expect(o.reasons).toContain('firstBaseline')
    expect(updateCognitionBaseline({}, { span: 6, gng: ok })).toEqual({ span: 6, gngRtMs: 400 })
  })
  it('watches a 2-digit memory drop, 3+ impulse errors, 3+ lapses, or 20% slower', () => {
    const base = { span: 7, gngRtMs: 400 }
    expect(assessCognition({ span: 5, gng: ok }, base).reasons).toEqual(['spanDrop'])
    expect(assessCognition({ span: 7, gng: { ...ok, commission: 3 } }, base).reasons).toEqual(['impulse'])
    expect(assessCognition({ span: 7, gng: { ...ok, omission: 3 } }, base).reasons).toEqual(['lapses'])
    expect(assessCognition({ span: 7, gng: { ...ok, meanRtMs: 480 } }, base).reasons).toEqual(['slower'])
    expect(assessCognition({ span: 6, gng: { ...ok, meanRtMs: 470 } }, base).level).toBe('nominal')
  })
  it('adds a behavioural watch finding that privacy can withhold', () => {
    const m = buildMission('nominal')
    const outcome = assessCognition({ span: 4, gng: ok }, { span: 7, gngRtMs: 400 })
    const p = applyDailyCheck(m, 'cdr', { cognition: outcome })
    const a = assess(p.crew.find((c) => c.id === 'cdr')!, { profile: 'mars', delaySec: 660 })
    const f = a.findings.find((x) => x.id === 'event.cognition')
    expect(f?.level).toBe('watch')
    expect(f?.behavioral).toBe(true)
    expect(buildPayload(a, { shareBehavioral: false }, 'en').findings.some((x) => x.id === 'event.cognition')).toBe(false)
  })
})

describe('free-text note', () => {
  it('suggests check-in boxes from keywords in English and Turkish', () => {
    expect(evaluateNoteOffline('Bad headache since lunch and my eyes feel blurry').flags).toEqual(['headache', 'vision'])
    expect(evaluateNoteOffline('Dün gece uyuyamadım, çok yorgunum ve başım ağrıyor').flags).toEqual(['headache', 'sleep'])
    expect(evaluateNoteOffline('All good today').flags).toEqual([])
    expect(evaluateNoteOffline('Lower back ache after the treadmill').flags).toEqual(['pain'])
    expect(evaluateNoteOffline('Belim ağrıyor').flags).toEqual(['pain'])
  })
  it('flags urgent words', () => {
    expect(evaluateNoteOffline('Sudden chest pain while exercising').urgent).toBe(true)
    expect(evaluateNoteOffline('Göğüs ağrım var').urgent).toBe(true)
    expect(evaluateNoteOffline('a bit tired').urgent).toBe(false)
  })
  it('accepts only the AI schema and known flags', () => {
    const r = parseAiNote({ summary: 'Poor sleep.', message: 'Rest tonight.', flags: ['sleep', 'cancer', 'sleep'], tellSurgeon: false })
    expect(r?.flags).toEqual(['sleep'])
    expect(parseAiNote({ summary: 'x', message: 'y', flags: 'sleep', tellSurgeon: false })).toBeNull()
    expect(parseAiNote({ summary: '', message: 'y', flags: [], tellSurgeon: false })).toBeNull()
  })
  it('rejects AI text with new numbers or medication / dose advice', () => {
    const r = { summary: 'You slept 4 hours.', message: 'Rest.', flags: [], tellSurgeon: false }
    expect(aiNoteNumbersGrounded(r, 'I slept 4 hours')).toBe(true)
    expect(aiNoteNumbersGrounded(r, 'I slept badly')).toBe(false)
    expect(aiNoteIsSafe({ ...r, message: 'Take 400 mg ibuprofen.' })).toBe(false)
    expect(aiNoteIsSafe(r)).toBe(true)
  })
})
