import { useEffect, useMemo, useRef, useState } from 'react'
import { AwardIcon, BrainIcon, CheckIcon, ClipboardCheckIcon, EyeIcon, FlameIcon, MessageSquareTextIcon, PlayIcon, TimerIcon, TrafficConeIcon, XIcon } from 'lucide-react'
import { DigitSpanCard, GoNoGoCard, NoteCard } from './daily-tests'
import { dt } from '../../i18n/daily'
import { useDashboardNavigation } from '../bionis/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useI18n } from '../../i18n'
import { TIER_NAMES } from '../../i18n/findings'
import { useMission } from '../../state/mission'
import { needsFullAcuity } from '../../engine'
import { vt, type VisionKey } from '../../i18n/vision'
import { loadCrewVision, loadFullDaily } from '../../services/vision-store'
import { VisionCheckFlow } from './vision-check'
import { CardTitle, InfoButton, PageHeader, Pill, Segmented, SimBadge, SimulatedBadge, tierLevel } from './ui'

const PVT_TRIALS = 5
const PVT_KEY = 'astrotwin:pvt-baseline'

type PvtPhase = 'idle' | 'waiting' | 'go' | 'early' | 'done'

/** PVT-style reaction test. The user's own first run becomes their baseline. */
function PvtCard() {
  const { t } = useI18n()
  const { current, submitCheck } = useMission()
  const [phase, setPhase] = useState<PvtPhase>('idle')
  const [times, setTimes] = useState<number[]>([])
  const [baseline, setBaseline] = useState<number | null>(() => {
    try {
      const v = Number(localStorage.getItem(PVT_KEY))
      return Number.isFinite(v) && v > 0 ? v : null
    } catch {
      return null
    }
  })
  const [result, setResult] = useState<{ mean: number; ratio: number; first: boolean } | null>(null)
  const goAt = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  const arm = () => {
    setPhase('waiting')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      goAt.current = performance.now()
      setPhase('go')
    }, 1500 + Math.random() * 2500)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const finish = (all: number[]) => {
    const mean = Math.round(all.reduce((s, v) => s + v, 0) / all.length)
    const first = baseline === null
    const base = baseline ?? mean
    if (first) {
      setBaseline(mean)
      try {
        localStorage.setItem(PVT_KEY, String(mean))
      } catch {
        /* ignore */
      }
    }
    const ratio = mean / base
    setResult({ mean, ratio, first })
    setPhase('done')
    // Map the user's change vs. THEIR baseline onto the selected crew member's
    // own expected reaction time, so a naturally slower/faster user is not penalised.
    submitCheck(current.crewId, { pvtMs: Math.round(current.metrics.pvtMs.expected * ratio) }, 'pvt')
  }

  const press = () => {
    if (phase === 'idle' || phase === 'done') {
      setTimes([])
      setResult(null)
      arm()
    } else if (phase === 'waiting') {
      window.clearTimeout(timer.current)
      setPhase('early')
    } else if (phase === 'early') {
      arm()
    } else if (phase === 'go') {
      const rt = Math.round(performance.now() - goAt.current)
      const all = [...times, rt]
      setTimes(all)
      if (all.length >= PVT_TRIALS) finish(all)
      else arm()
    }
  }

  const label =
    phase === 'idle' ? t('pvt.start')
    : phase === 'waiting' ? t('pvt.wait')
    : phase === 'go' ? t('pvt.go')
    : phase === 'early' ? t('pvt.early')
    : t('pvt.again')

  return (
    <article className="flex flex-col gap-5 rounded-2xl border bg-[linear-gradient(180deg,rgb(99_102_241/0.08)_0%,transparent_42%)] p-5">
      <CardTitle
        icon={TimerIcon}
        color="var(--insight-prediction)"
        right={<span className="flex items-center gap-1"><InfoButton id="pvtMs" name={t('metric.pvtMs')} /><span className="text-xs text-muted-foreground">{t('pvt.trial', { n: Math.min(times.length + (phase === 'done' ? 0 : 1), PVT_TRIALS), total: PVT_TRIALS })}</span></span>}
      >
        {t('pvt.title')}
      </CardTitle>
      <p className="text-sm leading-relaxed text-muted-foreground">{t('pvt.help')}</p>
      <button
        type="button"
        onClick={press}
        aria-live="assertive"
        className={cn(
          'flex h-40 w-full items-center justify-center rounded-xl border text-lg font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          phase === 'go' ? 'border-transparent bg-(--live) text-white' : phase === 'early' ? 'bg-(--chart-warn-bg) text-(--chart-warn)' : 'bg-muted',
        )}
      >
        {label}
      </button>
      <div className="flex flex-wrap items-center gap-2 text-sm" role="status">
        {times.map((ms, i) => (
          <span key={i} className="rounded-lg bg-muted px-2 py-1 tabular-nums">
            {ms} ms
          </span>
        ))}
      </div>
      {result ? (
        <div className="flex flex-col gap-1.5 rounded-xl bg-background p-3">
          <p className="text-sm font-medium">
            {t('pvt.mean', { ms: result.mean })}
            {baseline ? ` · ${t('pvt.baseline', { ms: baseline })}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {result.first
              ? t('pvt.first')
              : t('pvt.delta', { pct: `${result.ratio >= 1 ? '+' : ''}${Math.round((result.ratio - 1) * 100)}` })}
          </p>
        </div>
      ) : baseline ? (
        <p className="text-xs text-muted-foreground">{t('pvt.baseline', { ms: baseline })}</p>
      ) : null}
    </article>
  )
}


function SelfReportCard() {
  const { t, lang } = useI18n()
  const [q, setQ] = useState(0)
  const { current, submitCheck } = useMission()
  const r = current.record
  const [mood, setMood] = useState(r.mood)
  const [stress, setStress] = useState(r.stress)
  const [sleepH, setSleepH] = useState(String(r.sleepH))
  const [feelsFine, setFeelsFine] = useState(r.feelsFine)
  const [headache, setHeadache] = useState(r.headache)
  const [rash, setRash] = useState(r.rash)
  const [eye, setEye] = useState(Boolean(r.eyeSymptom))
  const [saved, setSaved] = useState(false)

  // Re-seed the form when another crew member or scenario is selected.
  useEffect(() => {
    setMood(r.mood)
    setStress(r.stress)
    setSleepH(String(r.sleepH))
    setFeelsFine(r.feelsFine)
    setHeadache(r.headache)
    setRash(r.rash)
    setEye(Boolean(r.eyeSymptom))
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.crewId, current.day])

  const scale = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (q < 3) {
      setQ((n) => n + 1)
      return
    }
    const hours = Math.min(14, Math.max(0, Number(sleepH) || 0))
    submitCheck(current.crewId, { mood, stress, sleepH: hours, feelsFine, headache, rash, eyeSymptom: eye }, 'self')
    setSaved(true)
  }
  const checkbox = (label: string, checked: boolean, set: (v: boolean) => void) => (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="size-4 accent-(--bionis-blue)" />
      {label}
    </label>
  )

  const total = 4
  const last = q === total - 1
  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border bg-background p-5">
      <CardTitle icon={ClipboardCheckIcon} color="var(--bionis-blue)" right={<InfoButton id="mood" name={t('metric.mood')} />}>
        {t('check.form')}
      </CardTitle>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{dt(lang, 'qOf', { n: q + 1, total })}</span>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-(--bionis-blue) transition-all" style={{ width: `${((q + 1) / total) * 100}%` }} />
        </div>
      </div>
      <div className="min-h-40" aria-live="polite">
        {q === 0 ? (
          <div className="flex flex-col gap-3">
            <span className="text-lg font-medium">{t('check.mood')}</span>
            <Segmented value={mood} options={scale} onChange={setMood} label={t('check.mood')} />
          </div>
        ) : null}
        {q === 1 ? (
          <div className="flex flex-col gap-3">
            <span className="text-lg font-medium">{t('check.stress')}</span>
            <Segmented value={stress} options={scale} onChange={setStress} label={t('check.stress')} />
          </div>
        ) : null}
        {q === 2 ? (
          <label className="flex flex-col gap-3">
            <span className="flex items-center gap-1.5 text-lg font-medium">
              {t('check.sleep')}
              <InfoButton id="sleepH" name={t('metric.sleepH')} />
            </span>
            <input
              type="number"
              // any decimal: recorded values like 4.7 h must not fail form validation
              step="any"
              inputMode="decimal"
              min="0"
              max="14"
              value={sleepH}
              onChange={(e) => setSleepH(e.target.value)}
              className="h-12 w-40 rounded-xl border bg-background px-3 text-lg outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        ) : null}
        {q === 3 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-3 text-lg font-medium">{t('check.symptoms')}</legend>
            {checkbox(t('check.fine'), feelsFine, setFeelsFine)}
            {checkbox(t('check.headache'), headache, setHeadache)}
            {checkbox(t('check.rash'), rash, setRash)}
            {checkbox(t('check.eye'), eye, setEye)}
          </fieldset>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={q === 0} onClick={() => setQ((n) => Math.max(0, n - 1))}>
          {dt(lang, 'qPrev')}
        </Button>
        {last ? (
          <Button type="submit">{t('check.save')}</Button>
        ) : (
          <Button type="button" onClick={() => setQ((n) => Math.min(total - 1, n + 1))}>
            {dt(lang, 'qNext')}
          </Button>
        )}
        <span className="text-sm font-medium text-(--live)" role="status">
          {saved ? t('check.saved') : ''}
        </span>
      </div>
    </form>
  )
}

function StreakCard() {
  const { t } = useI18n()
  const { current, checkinFor } = useMission()
  const s = checkinFor(current.crewId)
  const badges = [
    { id: 'week', on: s.badges.week, icon: FlameIcon },
    { id: 'full', on: s.badges.full, icon: ClipboardCheckIcon },
    { id: 'vision', on: s.badges.vision, icon: EyeIcon },
  ] as const
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-background p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--chart-warn-bg) text-(--chart-warn)">
            <FlameIcon className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium">{t('streak.title')} · {current.name}</p>
            <p className="leading-none">
              <span className="text-2.5xl font-medium tabular-nums">{s.streak}</span>{' '}
              <span className="font-normal">{t('streak.days')}</span>
            </p>
          </div>
        </div>
        <SimulatedBadge />
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {badges.map((b) => {
          const Icon = b.on ? b.icon : AwardIcon
          return (
            <li
              key={b.id}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5',
                b.on ? 'bg-(--live)/10' : 'bg-muted/60',
              )}
            >
              <Icon className={cn('size-5 shrink-0', b.on ? 'text-(--live)' : 'text-muted-foreground')} />
              <div className="min-w-0">
                <p className={cn('text-sm font-medium', !b.on && 'text-muted-foreground')}>
                  {t(`streak.badge.${b.id}`)}{' '}
                  <span className="text-xs font-normal">· {b.on ? t('streak.earned') : t('streak.open')}</span>
                </p>
                <p className="text-xs text-muted-foreground">{t(`streak.badge.${b.id}.sub`)}</p>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted-foreground">{t('streak.sub')}</p>
    </section>
  )
}

/** Today's vision plan for the selected crew member: quick or full, and the last result. */
function useVisionPlan(version: number) {
  const { current } = useMission()
  const rec = useMemo(() => loadCrewVision(current.crewId), [current.crewId, version])
  const full = needsFullAcuity({
    fullDaily: loadFullDaily(),
    eyeSymptom: Boolean(current.record.eyeSymptom),
    lastFullAt: rec.lastFullAt,
    now: Date.now(),
  })
  return { full, last: rec.last }
}

type DailyStep = 'pvt' | 'gonogo' | 'memory' | 'self' | 'note' | 'vision' | 'done'
const DAILY_STEPS: DailyStep[] = ['pvt', 'gonogo', 'memory', 'self', 'note', 'vision', 'done']

const enterFullscreen = () => {
  try {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {})
  } catch {
    /* not supported: the flow still fills the window */
  }
}
const exitFullscreen = () => {
  try {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {})
  } catch {
    /* ignore */
  }
}

/** The daily check, full screen: reaction test → self-report → vision check → summary. */
function DailyCheckFlow({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n()
  const { current, checkinFor, submitCheck } = useMission()
  const status = checkinFor(current.crewId)
  const [i, setI] = useState(0)
  const [visionOpen, setVisionOpen] = useState(false)
  const [version, setVersion] = useState(0)
  const plan = useVisionPlan(version)
  const step = DAILY_STEPS[i]
  const stepDone = step === 'done' || status.done[step]
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.focus()
  }, [i])

  const close = () => {
    exitFullscreen()
    onClose()
  }
  const total = DAILY_STEPS.length - 1
  const stepName = (k: DailyStep) =>
    k === 'gonogo' ? dt(lang, 'stepGng') : k === 'memory' ? dt(lang, 'stepSpan') : k === 'note' ? dt(lang, 'stepNote') : t(({ pvt: 'daily.step1', self: 'daily.step2', vision: 'daily.step3', done: 'daily.step4' } as const)[k])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-title"
      tabIndex={-1}
      className="bionis-dashboard fixed inset-0 z-40 flex flex-col bg-background outline-none"
    >
      <header className="flex flex-col gap-3 border-b px-4 py-3 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 id="daily-title" className="truncate text-lg font-medium">
              {t('daily.title')} · {current.name}
            </h2>
            <SimulatedBadge />
          </div>
          <Button type="button" variant="ghost" onClick={close} aria-label={t('daily.exit')}>
            <XIcon />
            <span className="hidden sm:inline">{t('daily.exit')}</span>
          </Button>
        </div>
        <ol className="flex gap-2" aria-label={step === 'done' ? t('daily.step4') : t('daily.stepOf', { n: i + 1, total })}>
          {DAILY_STEPS.map((sKey, k) => {
            const done = sKey !== 'done' && status.done[sKey]
            return (
              <li key={sKey} className="flex min-w-0 flex-1 flex-col gap-1" aria-current={k === i ? 'step' : undefined}>
                <span className={cn('h-1.5 rounded-full', k === i ? 'bg-(--bionis-blue)' : done || k < i ? 'bg-(--live)' : 'bg-muted')} />
                <span className={cn('flex items-center gap-1 truncate text-xs', k === i ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {done ? <CheckIcon className="size-3.5 shrink-0 text-(--live)" aria-hidden="true" /> : null}
                  {stepName(sKey)}
                </span>
              </li>
            )
          })}
        </ol>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {step === 'pvt' ? <PvtCard key={`pvt-${current.crewId}`} /> : null}
          {step === 'gonogo' ? <GoNoGoCard key={`gng-${current.crewId}`} /> : null}
          {step === 'memory' ? <DigitSpanCard key={`span-${current.crewId}`} /> : null}
          {step === 'self' ? <SelfReportCard key={`self-${current.crewId}`} /> : null}
          {step === 'note' ? <NoteCard key={`note-${current.crewId}`} /> : null}
          {step === 'vision' ? (
            <article className="flex flex-col gap-5 rounded-2xl border bg-[linear-gradient(180deg,rgb(20_184_166/0.08)_0%,transparent_42%)] p-5">
              <CardTitle icon={EyeIcon} color="var(--insight-actions)" right={<InfoButton id="vision" name={t('metric.vision')} />}>
                {vt(lang, 'title')}
              </CardTitle>
              <span className="inline-flex w-fit items-center rounded-xl bg-(--chart-warn-bg) px-2.5 py-1 text-xs font-medium text-(--chart-warn)">
                {vt(lang, 'screening')}
              </span>
              <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm">{vt(lang, plan.full ? 'modeFull' : 'modeQuick')}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{vt(lang, 'why')}</p>
              {status.done.vision && plan.last ? (
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{vt(lang, 'last')}:</span>
                  <Pill level={plan.last.outcome.level} className="px-2.5 text-xs">
                    {vt(lang, `level.${plan.last.outcome.level}` as VisionKey)}
                  </Pill>
                </p>
              ) : null}
              <Button type="button" autoFocus className="h-12 w-fit gap-2 px-6 text-base" onClick={() => setVisionOpen(true)}>
                <PlayIcon className="size-4" />
                {t('daily.visionStart')}
              </Button>
              {visionOpen ? (
                <VisionCheckFlow
                  crewId={current.crewId}
                  full={plan.full}
                  onClose={() => {
                    setVisionOpen(false)
                    setVersion((v) => v + 1)
                  }}
                  onComplete={(outcome) => {
                    submitCheck(current.crewId, { vision: outcome, visionChange: outcome.level !== 'nominal' }, 'vision')
                    setVersion((v) => v + 1)
                  }}
                />
              ) : null}
            </article>
          ) : null}
          {step === 'done' ? (
            <article className="flex flex-col gap-4 rounded-2xl border bg-background p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-(--live)/15 text-(--live)">
                  <CheckIcon className="size-5" />
                </span>
                <h3 className="text-lg font-medium">{t('daily.finishTitle')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {status.done.pvt && status.done.self && status.done.vision ? t('daily.finishSub') : t('daily.partial')}
              </p>
              <StreakCard />
              <Button type="button" autoFocus className="h-12 w-fit px-6 text-base" onClick={close}>
                {t('daily.close')}
              </Button>
            </article>
          ) : null}
        </div>
      </main>

      {step !== 'done' ? (
        <footer className="flex items-center justify-between gap-3 border-t px-4 py-3 md:px-8">
          <Button type="button" variant="outline" className="h-11" disabled={i === 0} onClick={() => setI((n) => Math.max(0, n - 1))}>
            {t('daily.back')}
          </Button>
          <div className="flex items-center gap-2">
            {!stepDone ? (
              <Button type="button" variant="ghost" className="h-11" onClick={() => setI((n) => n + 1)}>
                {t('daily.skip')}
              </Button>
            ) : null}
            <Button type="button" className="h-11 px-6" disabled={!stepDone} onClick={() => setI((n) => n + 1)}>
              {t('daily.next')}
            </Button>
          </div>
        </footer>
      ) : null}
    </div>
  )
}

/** Entry card: one Start button for the whole daily check. */
function DailyCheckHero({ onStart }: { onStart: () => void }) {
  const { t, lang } = useI18n()
  const { current, checkinFor } = useMission()
  const status = checkinFor(current.crewId)
  const plan = useVisionPlan(0)
  const all = status.done.pvt && status.done.self && status.done.vision
  const visionMode = vt(lang, plan.full ? 'modeFull' : 'modeQuick').replace(/^[^:]+:\s*/, '')
  const steps: Array<[Exclude<DailyStep, 'done'>, typeof TimerIcon, string]> = [
    ['pvt', TimerIcon, t('daily.step1')],
    ['gonogo', TrafficConeIcon, dt(lang, 'stepGng')],
    ['memory', BrainIcon, dt(lang, 'stepSpan')],
    ['self', ClipboardCheckIcon, t('daily.step2')],
    ['note', MessageSquareTextIcon, dt(lang, 'stepNote')],
    ['vision', EyeIcon, `${t('daily.step3')} · ${visionMode}`],
  ]
  return (
    <section data-tour="dailycheck" className="flex flex-col gap-5 rounded-2xl border bg-[linear-gradient(180deg,rgb(99_102_241/0.08)_0%,transparent_42%)] p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-medium">{t('daily.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('daily.sub')}</p>
      </div>
      <ol className="flex flex-col gap-2">
        {steps.map(([key, Icon, label], k) => (
          <li key={key} className="flex items-center gap-3 rounded-xl bg-background/70 px-3 py-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--bionis-blue) text-xs font-semibold text-white">{k + 1}</span>
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-sm">{label}</span>
            <span className={cn('shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium', status.done[key] ? 'bg-(--live)/15 text-(--live)' : 'bg-muted text-muted-foreground')}>
              {status.done[key] ? t('daily.doneTag') : t('daily.todoTag')}
            </span>
          </li>
        ))}
      </ol>
      <span className="inline-flex w-fit items-center rounded-xl bg-(--chart-warn-bg) px-2.5 py-1 text-xs font-medium text-(--chart-warn)">
        {vt(lang, 'screening')}
      </span>
      <Button type="button" className="h-14 w-full gap-2 text-lg sm:w-fit sm:px-10" onClick={onStart}>
        <PlayIcon className="size-5" />
        {all ? t('daily.again') : t('daily.start')}
      </Button>
    </section>
  )
}

export function CheckContent() {
  const { t, lang } = useI18n()
  const { navigate } = useDashboardNavigation()
  const { current } = useMission()
  const [running, setRunning] = useState(false)
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('check.title')}
        subtitle={t('check.subtitle', { name: current.name, day: current.day })}
        right={
          <div className="flex items-center gap-2">
            <Pill level={tierLevel[current.tier]}>
              {t('tier.label')}: {TIER_NAMES[lang][current.tier]} · {current.score}/100
            </Pill>
            <Button type="button" variant="outline" onClick={() => navigate('/surgeon')}>
              {t('compound.open')}
            </Button>
          </div>
        }
      />
      <SimBadge />
      <DailyCheckHero
        onStart={() => {
          enterFullscreen()
          setRunning(true)
        }}
      />
      <StreakCard />
      {running ? <DailyCheckFlow onClose={() => setRunning(false)} /> : null}
    </div>
  )
}
