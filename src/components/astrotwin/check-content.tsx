import { useEffect, useRef, useState } from 'react'
import { ClipboardCheckIcon, EyeIcon, TimerIcon } from 'lucide-react'
import { useDashboardNavigation } from '../bionis/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useI18n } from '../../i18n'
import { TIER_NAMES } from '../../i18n/findings'
import { useMission } from '../../state/mission'
import { CardTitle, PageHeader, Pill, Segmented, SimBadge, tierLevel } from './ui'

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
    submitCheck(current.crewId, { pvtMs: Math.round(current.metrics.pvtMs.expected * ratio) })
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
        right={<span className="text-xs text-muted-foreground">{t('pvt.trial', { n: Math.min(times.length + (phase === 'done' ? 0 : 1), PVT_TRIALS), total: PVT_TRIALS })}</span>}
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

const GRID = 20
const CELL = 14

/** Amsler grid vision self-test: mark the areas that look wavy, blurred or missing. */
function AmslerCard() {
  const { t } = useI18n()
  const { current, submitCheck } = useMission()
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [manual, setManual] = useState(false)
  const [saved, setSaved] = useState<boolean | null>(null)

  const toggle = (key: string) => {
    setSaved(null)
    setMarked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const abnormal = marked.size > 0 || manual
  const save = () => {
    submitCheck(current.crewId, { visionChange: abnormal })
    setSaved(abnormal)
  }
  const size = GRID * CELL

  return (
    <article className="flex flex-col gap-5 rounded-2xl border bg-[linear-gradient(180deg,rgb(20_184_166/0.08)_0%,transparent_42%)] p-5">
      <CardTitle icon={EyeIcon} color="var(--insight-actions)">
        {t('amsler.title')}
      </CardTitle>
      <p className="text-sm leading-relaxed text-muted-foreground">{t('amsler.help')}</p>
      <div className="flex justify-center rounded-xl bg-white p-3">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="aspect-square w-full max-w-72 cursor-crosshair"
          role="img"
          aria-label={t('amsler.aria')}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID)
            const y = Math.floor(((e.clientY - rect.top) / rect.height) * GRID)
            if (x >= 0 && y >= 0 && x < GRID && y < GRID) toggle(`${x}-${y}`)
          }}
        >
          {[...marked].map((key) => {
            const [x, y] = key.split('-').map(Number)
            return <rect key={key} x={x * CELL} y={y * CELL} width={CELL} height={CELL} fill="#ef4444" fillOpacity={0.45} />
          })}
          {Array.from({ length: GRID + 1 }, (_, i) => (
            <g key={i} stroke="#0f172a" strokeWidth={0.6}>
              <line x1={i * CELL} y1={0} x2={i * CELL} y2={size} />
              <line x1={0} y1={i * CELL} x2={size} y2={i * CELL} />
            </g>
          ))}
          <circle cx={size / 2} cy={size / 2} r={3} fill="#0f172a" />
        </svg>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={manual}
          onChange={(e) => {
            setManual(e.target.checked)
            setSaved(null)
          }}
          className="size-4 accent-(--bionis-blue)"
        />
        {t('amsler.manual')}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save}>
          {t('amsler.save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setMarked(new Set())
            setManual(false)
            setSaved(null)
          }}
        >
          {t('amsler.clear')}
        </Button>
        <span className="text-sm font-medium" role="status">
          {saved === null ? '' : saved ? t('amsler.abnormal') : t('amsler.normal')}
        </span>
      </div>
    </article>
  )
}

function SelfReportCard() {
  const { t } = useI18n()
  const { current, submitCheck } = useMission()
  const r = current.record
  const [mood, setMood] = useState(r.mood)
  const [stress, setStress] = useState(r.stress)
  const [sleepH, setSleepH] = useState(String(r.sleepH))
  const [feelsFine, setFeelsFine] = useState(r.feelsFine)
  const [headache, setHeadache] = useState(r.headache)
  const [rash, setRash] = useState(r.rash)
  const [saved, setSaved] = useState(false)

  // Re-seed the form when another crew member or scenario is selected.
  useEffect(() => {
    setMood(r.mood)
    setStress(r.stress)
    setSleepH(String(r.sleepH))
    setFeelsFine(r.feelsFine)
    setHeadache(r.headache)
    setRash(r.rash)
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.crewId, current.day])

  const scale = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const hours = Math.min(14, Math.max(0, Number(sleepH) || 0))
    submitCheck(current.crewId, { mood, stress, sleepH: hours, feelsFine, headache, rash })
    setSaved(true)
  }
  const checkbox = (label: string, checked: boolean, set: (v: boolean) => void) => (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="size-4 accent-(--bionis-blue)" />
      {label}
    </label>
  )

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border bg-background p-5">
      <CardTitle icon={ClipboardCheckIcon} color="var(--bionis-blue)">
        {t('check.form')}
      </CardTitle>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t('check.mood')}</span>
        <Segmented value={mood} options={scale} onChange={setMood} label={t('check.mood')} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t('check.stress')}</span>
        <Segmented value={stress} options={scale} onChange={setStress} label={t('check.stress')} />
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t('check.sleep')}</span>
        <input
          type="number"
          step="0.5"
          min="0"
          max="14"
          value={sleepH}
          onChange={(e) => setSleepH(e.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t('check.symptoms')}</legend>
        {checkbox(t('check.fine'), feelsFine, setFeelsFine)}
        {checkbox(t('check.headache'), headache, setHeadache)}
        {checkbox(t('check.rash'), rash, setRash)}
      </fieldset>
      <div className="flex items-center gap-3">
        <Button type="submit">{t('check.save')}</Button>
        <span className="text-sm font-medium text-(--live)" role="status">
          {saved ? t('check.saved') : ''}
        </span>
      </div>
    </form>
  )
}

export function CheckContent() {
  const { t, lang } = useI18n()
  const { navigate } = useDashboardNavigation()
  const { current } = useMission()
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
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <PvtCard key={`pvt-${current.crewId}`} />
        <SelfReportCard />
        <AmslerCard key={`amsler-${current.crewId}`} />
      </section>
    </div>
  )
}
