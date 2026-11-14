// Extra daily-check steps: Go/No-Go (attention and impulse control), number
// memory (digit span) and a free-text note with an optional AI reflection.
// All results are compared with the person's own first run.
import { useCallback, useEffect, useRef, useState } from 'react'
import { BrainIcon, MessageSquareTextIcon, SparklesIcon, TrafficConeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  answerSpan,
  assessCognition,
  evaluateNoteOffline,
  makeDigits,
  makeGngTrials,
  NOTE_MAX,
  scoreGng,
  startSpan,
  updateCognitionBaseline,
  type AiNoteResult,
  type CognitionBaseline,
  type CognitionResult,
  type DayRecord,
  type GngKind,
  type GngResponse,
  type GngResult,
  type NoteFlag,
  type SpanState,
} from '../../engine'
import { useI18n } from '../../i18n'
import { dt } from '../../i18n/daily'
import { reflectNote } from '../../services/reflect'
import { useMission } from '../../state/mission'
import { CardTitle, SourceBadge } from './ui'

// ---------------------------------------------------------------------------
// Cognition storage (per device): personal baseline + today's partial results
// ---------------------------------------------------------------------------
const baseKey = (crewId: string) => `astrotwin:cognition:base:${crewId}`
function loadBase(crewId: string): CognitionBaseline {
  try {
    return JSON.parse(localStorage.getItem(baseKey(crewId)) ?? '{}') as CognitionBaseline
  } catch {
    return {}
  }
}
function saveBase(crewId: string, b: CognitionBaseline) {
  try {
    localStorage.setItem(baseKey(crewId), JSON.stringify(b))
  } catch {
    /* storage unavailable: still applies to this session */
  }
}
/** Today's results so far, per crew member (kept in memory for the session). */
const today = new Map<string, CognitionResult>()

/** Merge one test result, assess against the baseline, then update the baseline. */
function useSubmitCognition() {
  const { current, submitCheck } = useMission()
  return useCallback(
    (part: CognitionResult, kind: 'gonogo' | 'memory') => {
      const merged = { ...today.get(current.crewId), ...part }
      today.set(current.crewId, merged)
      const base = loadBase(current.crewId)
      const outcome = assessCognition(merged, base)
      saveBase(current.crewId, updateCognitionBaseline(base, merged))
      submitCheck(current.crewId, { cognition: outcome }, kind)
    },
    [current.crewId, submitCheck],
  )
}

// ---------------------------------------------------------------------------
// Go / No-Go
// ---------------------------------------------------------------------------
const SHOW_MS = 900

export function GoNoGoCard() {
  const { lang } = useI18n()
  const submit = useSubmitCognition()
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [trials, setTrials] = useState<GngKind[]>([])
  const [n, setN] = useState(0)
  const [showing, setShowing] = useState<GngKind | null>(null)
  const [result, setResult] = useState<GngResult | null>(null)
  const responses = useRef<GngResponse[]>([])
  const shownAt = useRef(0)
  const pressed = useRef(false)
  const timers = useRef<number[]>([])

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clear, [])

  const runTrial = useCallback(
    (list: GngKind[], i: number) => {
      if (i >= list.length) {
        const r = scoreGng(responses.current)
        setResult(r)
        setShowing(null)
        setPhase('done')
        submit({ gng: r }, 'gonogo')
        return
      }
      setN(i)
      setShowing(null)
      const gap = 600 + Math.random() * 700
      timers.current.push(
        window.setTimeout(() => {
          pressed.current = false
          shownAt.current = performance.now()
          setShowing(list[i])
          timers.current.push(
            window.setTimeout(() => {
              if (!pressed.current) responses.current.push({ kind: list[i], pressed: false })
              runTrial(list, i + 1)
            }, SHOW_MS),
          )
        }, gap),
      )
    },
    [submit],
  )

  const start = () => {
    clear()
    const list = makeGngTrials()
    responses.current = []
    setTrials(list)
    setResult(null)
    setPhase('running')
    runTrial(list, 0)
  }

  const press = useCallback(() => {
    if (phase !== 'running' || !showing || pressed.current) return
    pressed.current = true
    responses.current.push({ kind: showing, pressed: true, rtMs: Math.round(performance.now() - shownAt.current) })
    setShowing(null)
  }, [phase, showing])

  useEffect(() => {
    if (phase !== 'running') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        press()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, press])

  return (
    <article className="flex flex-col gap-5 rounded-2xl border bg-[linear-gradient(180deg,rgb(99_102_241/0.08)_0%,transparent_42%)] p-5">
      <CardTitle
        icon={TrafficConeIcon}
        color="var(--insight-prediction)"
        right={phase === 'running' ? <span className="text-xs text-muted-foreground tabular-nums">{dt(lang, 'gngTrial', { n: n + 1, total: trials.length })}</span> : undefined}
      >
        {dt(lang, 'gngTitle')}
      </CardTitle>
      <p className="text-sm leading-relaxed text-muted-foreground">{dt(lang, 'gngHelp')}</p>
      {phase === 'running' ? (
        <button
          type="button"
          onClick={press}
          aria-label={dt(lang, 'gngPress')}
          className="flex h-56 w-full items-center justify-center rounded-xl border bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {showing ? (
            <span
              aria-live="assertive"
              className={cn('flex size-32 items-center justify-center rounded-full text-sm font-semibold text-white', showing === 'go' ? 'bg-[#16a34a]' : 'bg-[#dc2626]')}
            >
              {showing === 'go' ? dt(lang, 'gngGo') : dt(lang, 'gngNoGo')}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">{dt(lang, 'gngWait')}</span>
          )}
        </button>
      ) : (
        <Button type="button" autoFocus className="h-12 w-fit px-6 text-base" onClick={start}>
          {phase === 'done' ? dt(lang, 'gngAgain') : dt(lang, 'gngStart')}
        </Button>
      )}
      {result ? (
        <p className="rounded-xl bg-background px-3 py-2 text-sm font-medium" role="status">
          {dt(lang, 'gngResult', { commission: result.commission, omission: result.omission, rt: result.meanRtMs || '—' })}
        </p>
      ) : null}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Number memory (digit span)
// ---------------------------------------------------------------------------
export function DigitSpanCard() {
  const { lang } = useI18n()
  const submit = useSubmitCognition()
  const [state, setState] = useState<SpanState | null>(null)
  const [digits, setDigits] = useState<number[]>([])
  const [shown, setShown] = useState<number | null>(null)
  const [phase, setPhase] = useState<'idle' | 'watch' | 'type' | 'done'>('idle')
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'right' | 'wrong' | null>(null)
  const timers = useRef<number[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const play = (length: number) => {
    const d = makeDigits(length)
    setDigits(d)
    setAnswer('')
    setPhase('watch')
    d.forEach((digit, k) => {
      timers.current.push(window.setTimeout(() => setShown(digit), k * 1000 + 300))
      timers.current.push(window.setTimeout(() => setShown(null), k * 1000 + 1100))
    })
    timers.current.push(
      window.setTimeout(() => {
        setPhase('type')
        requestAnimationFrame(() => inputRef.current?.focus())
      }, d.length * 1000 + 400),
    )
  }
  const start = () => {
    const s = startSpan()
    setState(s)
    setFeedback(null)
    play(s.length)
  }
  const check = (e: React.FormEvent) => {
    e.preventDefault()
    if (!state) return
    const correct = answer.replace(/\D/g, '') === digits.join('')
    const next = answerSpan(state, correct)
    setState(next)
    setFeedback(correct ? 'right' : 'wrong')
    if (next.done) {
      setPhase('done')
      submit({ span: next.best }, 'memory')
    } else {
      timers.current.push(window.setTimeout(() => play(next.length), 900))
    }
  }

  return (
    <article className="flex flex-col gap-5 rounded-2xl border bg-[linear-gradient(180deg,rgb(20_184_166/0.08)_0%,transparent_42%)] p-5">
      <CardTitle icon={BrainIcon} color="var(--insight-actions)">
        {dt(lang, 'spanTitle')}
      </CardTitle>
      <p className="text-sm leading-relaxed text-muted-foreground">{dt(lang, 'spanHelp')}</p>
      {phase === 'watch' ? (
        <div className="flex h-40 items-center justify-center rounded-xl bg-muted" aria-live="polite">
          <span className="text-7xl font-semibold tabular-nums">{shown ?? ''}</span>
          {shown === null ? <span className="text-sm text-muted-foreground">{dt(lang, 'spanWatch')}</span> : null}
        </div>
      ) : null}
      {phase === 'type' ? (
        <form onSubmit={check} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{dt(lang, 'spanType')}</span>
            <input
              ref={inputRef}
              inputMode="numeric"
              autoComplete="off"
              value={answer}
              onChange={(e) => setAnswer(e.target.value.replace(/[^\d\s]/g, ''))}
              className="h-14 rounded-xl border bg-background px-4 text-3xl tracking-[0.3em] tabular-nums outline-none focus:ring-2 focus:ring-ring"
              aria-label={dt(lang, 'spanLabel')}
            />
          </label>
          <Button type="submit" className="h-12 w-fit px-6 text-base" disabled={!answer.trim()}>
            {dt(lang, 'spanCheck')}
          </Button>
        </form>
      ) : null}
      {feedback && phase !== 'done' ? (
        <p className={cn('text-sm font-medium', feedback === 'right' ? 'text-(--live)' : 'text-(--chart-warn)')} role="status">
          {feedback === 'right' ? dt(lang, 'spanCorrect') : dt(lang, 'spanWrong')}
        </p>
      ) : null}
      {phase === 'idle' || phase === 'done' ? (
        <Button type="button" autoFocus className="h-12 w-fit px-6 text-base" onClick={start}>
          {phase === 'done' ? dt(lang, 'spanAgain') : dt(lang, 'spanStart')}
        </Button>
      ) : null}
      {phase === 'done' && state ? (
        <p className="rounded-xl bg-background px-3 py-2 text-sm font-medium" role="status">
          {dt(lang, 'spanResult', { n: state.best })}
        </p>
      ) : null}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Free-text note + AI reflection
// ---------------------------------------------------------------------------
/** Check-in boxes that a note flag can tick, with the astronaut's confirmation. */
const FLAG_PATCH: Partial<Record<NoteFlag, Partial<DayRecord>>> = {
  headache: { headache: true },
  rash: { rash: true },
  vision: { eyeSymptom: true },
}

export function NoteCard() {
  const { lang } = useI18n()
  const { current, privacy, submitCheck } = useMission()
  const [note, setNote] = useState('')
  const [offline, setOffline] = useState<ReturnType<typeof evaluateNoteOffline> | null>(null)
  const [ai, setAi] = useState<AiNoteResult | null>(null)
  const [aiState, setAiState] = useState<'idle' | 'working' | 'off' | 'failed' | 'done'>('idle')
  const [added, setAdded] = useState<Set<NoteFlag>>(new Set())
  // Privacy: the note is behavioural. It goes to the AI only if the crew member shares
  // behavioural detail, or the tier is already critical (everything is shared then).
  const aiAllowed = privacy.shareBehavioral || current.tier === 'critical'

  const evaluate = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = note.trim()
    if (!text) return
    setOffline(evaluateNoteOffline(text))
    setAi(null)
    setAdded(new Set())
    submitCheck(current.crewId, {}, 'note')
    if (!aiAllowed) {
      setAiState('off')
      return
    }
    setAiState('working')
    const r = await reflectNote(text, lang)
    setAi(r)
    setAiState(r ? 'done' : 'failed')
  }

  const flags = [...new Set([...(offline?.flags ?? []), ...(ai?.flags ?? [])])]
  const add = (f: NoteFlag) => {
    const patch = FLAG_PATCH[f]
    if (!patch) return
    submitCheck(current.crewId, patch, 'self')
    setAdded((s) => new Set(s).add(f))
  }

  return (
    <article className="flex flex-col gap-5 rounded-2xl border bg-background p-5">
      <CardTitle icon={MessageSquareTextIcon} color="var(--bionis-blue)">
        {dt(lang, 'noteTitle')}
      </CardTitle>
      <p className="text-sm leading-relaxed text-muted-foreground">{dt(lang, 'noteHelp')}</p>
      <form onSubmit={evaluate} className="flex flex-col gap-3">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
          rows={5}
          placeholder={dt(lang, 'notePlaceholder')}
          aria-label={dt(lang, 'noteTitle')}
          className="w-full resize-y rounded-xl border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {note.length}/{NOTE_MAX}
          </span>
          <Button type="submit" className="h-11 gap-2 px-5" disabled={!note.trim() || aiState === 'working'}>
            <SparklesIcon className="size-4" />
            {dt(lang, 'noteEvaluate')}
          </Button>
        </div>
      </form>

      {offline ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          {offline.urgent || ai?.tellSurgeon ? (
            <p className="rounded-xl bg-(--prediction-danger)/10 px-3 py-2 text-sm font-medium text-(--prediction-danger)" role="alert">
              {offline.urgent ? dt(lang, 'noteUrgent') : dt(lang, 'noteTellSurgeon')}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{dt(lang, 'noteAi')}</p>
              {aiState === 'done' ? <SourceBadge source="live" /> : aiState === 'off' || aiState === 'failed' ? <SourceBadge source="embedded" /> : null}
            </div>
            {aiState === 'working' ? <p className="text-sm text-muted-foreground">{dt(lang, 'noteAiWorking')}</p> : null}
            {aiState === 'off' ? <p className="text-sm text-muted-foreground">{dt(lang, 'noteAiOff')}</p> : null}
            {aiState === 'failed' ? <p className="text-sm text-muted-foreground">{dt(lang, 'noteAiFailed')}</p> : null}
            {ai ? (
              <>
                <p className="text-sm">{ai.summary}</p>
                <p className="text-sm text-muted-foreground">{ai.message}</p>
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{flags.length ? dt(lang, 'noteFound') : dt(lang, 'noteNone')}</p>
            <ul className="flex flex-wrap gap-2">
              {flags.map((f) => (
                <li key={f} className="flex items-center gap-2 rounded-xl border bg-background px-3 py-1.5 text-sm">
                  {dt(lang, `flag.${f}`)}
                  {FLAG_PATCH[f] ? (
                    <Button type="button" size="sm" variant={added.has(f) ? 'secondary' : 'outline'} disabled={added.has(f)} onClick={() => add(f)}>
                      {added.has(f) ? dt(lang, 'noteAdded') : dt(lang, 'noteAdd')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {dt(lang, 'noteOffline')} · {dt(lang, 'noteRule')}
            </p>
          </div>
        </div>
      ) : null}
    </article>
  )
}
