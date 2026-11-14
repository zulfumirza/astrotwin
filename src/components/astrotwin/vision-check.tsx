// Vision Check: a short, screen-based version of the ISS vision follow-up for
// SANS — calibration, tumbling-E acuity per eye, Amsler grid per eye and a
// two-question eye questionnaire. Screening only, not a medical exam.
// Fully keyboard-operable; keeps the screen awake while open (Wake Lock API).
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, EyeIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  answerAcuity,
  assessVision,
  CARD_HEIGHT_MM,
  CARD_WIDTH_MM,
  DISTANCE_MM,
  LOGMAR_LEVELS,
  optotypeHeightPx,
  skipUndrawable,
  snellen,
  startAcuity,
  updateBaseline,
  type AcuityState,
  type AmslerAnswer,
  type Direction,
  type DistanceMode,
  type Eye,
  type VisionOutcome,
  type WorseAnswer,
} from '../../engine'
import { useI18n } from '../../i18n'
import { vt, type VisionKey } from '../../i18n/vision'
import {
  DEFAULT_PX_PER_MM,
  loadCalibration,
  loadCrewVision,
  saveCalibration,
  saveCrewVision,
  type Calibration,
} from '../../services/vision-store'
import { levelText, Pill } from './ui'

type Step = 'calibrate' | 'right' | 'left' | 'amslerR' | 'amslerL' | 'questions' | 'result'
const STEP_LABEL: Record<Step, VisionKey> = {
  calibrate: 'stepCalibrate',
  right: 'stepRight',
  left: 'stepLeft',
  amslerR: 'stepAmslerR',
  amslerL: 'stepAmslerL',
  questions: 'stepQuestions',
  result: 'stepResult',
}

const GRID = 20
const EMPTY_AMSLER: AmslerAnswer = { centerDot: true, allCorners: true, distortion: false, marks: [] }

/** Keep the screen on while a test is running; silently skip where unsupported. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    let lock: { release: () => Promise<void> } | null = null
    let cancelled = false
    const request = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
        if (!wl || document.visibilityState !== 'visible') return
        const l = await wl.request('screen')
        if (cancelled) void l.release().catch(() => {})
        else lock = l
      } catch {
        /* not supported or denied: carry on */
      }
    }
    void request()
    const onVis = () => {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release().catch(() => {})
    }
  }, [active])
}

/** Tumbling E drawn on a 5×5 grid; `right` = bars point right (a normal E). */
function TumblingE({ size, dir }: { size: number; dir: Direction }) {
  const rot = { right: 0, down: 90, left: 180, up: 270 }[dir]
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" aria-hidden="true" style={{ transform: `rotate(${rot}deg)` }} shapeRendering="crispEdges">
      <rect x="0" y="0" width="1" height="5" fill="#000" />
      <rect x="0" y="0" width="5" height="1" fill="#000" />
      <rect x="0" y="2" width="5" height="1" fill="#000" />
      <rect x="0" y="4" width="5" height="1" fill="#000" />
    </svg>
  )
}

const randomDir = (prev?: Direction): Direction => {
  const options = (['up', 'down', 'left', 'right'] as Direction[]).filter((d) => d !== prev)
  return options[Math.floor(Math.random() * options.length)]
}

function ScreeningTag({ lang }: { lang: 'en' | 'tr' }) {
  return (
    <span className="inline-flex w-fit items-center rounded-xl bg-(--chart-warn-bg) px-2.5 py-1 text-xs font-medium text-(--chart-warn)">
      {vt(lang, 'screening')}
    </span>
  )
}

function YesNo({ value, onChange, label, lang }: { value: boolean | null; onChange: (v: boolean) => void; label: string; lang: 'en' | 'tr' }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-base font-medium">{label}</legend>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {([true, false] as const).map((v) => (
          <Button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            variant={value === v ? 'default' : 'outline'}
            className="h-12 min-w-24 text-base"
            onClick={() => onChange(v)}
          >
            {v ? vt(lang, 'yes') : vt(lang, 'no')}
          </Button>
        ))}
      </div>
    </fieldset>
  )
}

// ---------------------------------------------------------------------------
// Calibration (card slider → distance mode → preparation)
// ---------------------------------------------------------------------------
export function CalibrationPanel({
  initial,
  onDone,
  onSkip,
}: {
  initial: Calibration | null
  onDone: (c: Calibration) => void
  onSkip?: (mode: DistanceMode) => void
}) {
  const { lang } = useI18n()
  const [widthPx, setWidthPx] = useState(Math.round((initial?.pxPerMm ?? DEFAULT_PX_PER_MM) * CARD_WIDTH_MM))
  const [mode, setMode] = useState<DistanceMode>(initial?.mode ?? 'phone40')
  const ppm = widthPx / CARD_WIDTH_MM
  const maxW = typeof window !== 'undefined' ? Math.max(260, Math.min(900, window.innerWidth - 64)) : 700

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium">{vt(lang, 'calTitle')}</h3>
        <p className="text-sm text-muted-foreground">{vt(lang, 'calHelp')}</p>
      </div>
      <div className="overflow-x-auto">
        <div
          className="rounded-[3mm] border-2 border-dashed border-(--bionis-blue) bg-(--chart-period-bg)"
          style={{ width: widthPx, height: widthPx * (CARD_HEIGHT_MM / CARD_WIDTH_MM) }}
          aria-hidden="true"
        />
      </div>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">
          {vt(lang, 'calSlider')}: {widthPx}px
        </span>
        <input
          type="range"
          min={150}
          max={maxW}
          step={1}
          value={widthPx}
          onChange={(e) => setWidthPx(Number(e.target.value))}
          className="h-8 w-full cursor-pointer accent-(--bionis-blue)"
        />
      </label>
      <p className="text-xs text-muted-foreground">{vt(lang, 'calDone', { ppm: ppm.toFixed(2) })}</p>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-base font-medium">{vt(lang, 'distTitle')}</legend>
        {(['phone40', 'laptop2m'] as DistanceMode[]).map((m) => (
          <label
            key={m}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border p-3',
              mode === m ? 'border-foreground/50 bg-muted/60' : 'bg-background',
            )}
          >
            <input type="radio" name="vision-mode" checked={mode === m} onChange={() => setMode(m)} className="mt-1 size-4 accent-(--bionis-blue)" />
            <span className="flex flex-col">
              <span className="font-medium">{vt(lang, m === 'phone40' ? 'distPhone' : 'distLaptop')}</span>
              <span className="text-xs text-muted-foreground">{vt(lang, m === 'phone40' ? 'distPhoneSub' : 'distLaptopSub')}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <ul className="list-disc pl-5 text-sm text-muted-foreground">
        <li>{vt(lang, 'prepGlasses')}</li>
        <li>{vt(lang, 'prepLight')}</li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-11 px-5 text-base" onClick={() => onDone({ pxPerMm: ppm, mode, at: Date.now() })}>
          {vt(lang, 'next')}
        </Button>
        {onSkip ? (
          <Button type="button" variant="ghost" className="h-11" onClick={() => onSkip(mode)}>
            {vt(lang, 'calSkip')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Acuity (one eye)
// ---------------------------------------------------------------------------
function AcuityTest({
  eye,
  distanceMm,
  pxPerMm,
  onDone,
}: {
  eye: Eye
  distanceMm: number
  pxPerMm: number
  onDone: (s: AcuityState) => void
}) {
  const { lang } = useI18n()
  const [phase, setPhase] = useState<'cover' | 'test'>('cover')
  const [state, setState] = useState<AcuityState>(() => skipUndrawable(startAcuity(), distanceMm, pxPerMm))
  const [dir, setDir] = useState<Direction>(() => randomDir())
  const doneRef = useRef(false)

  useEffect(() => {
    if (state.done && !doneRef.current) {
      doneRef.current = true
      onDone(state)
    }
  }, [state, onDone])

  const answer = useCallback(
    (d: Direction) => {
      setState((s) => skipUndrawable(answerAcuity(s, d === dir), distanceMm, pxPerMm))
      setDir((prev) => randomDir(prev))
    },
    [dir, distanceMm, pxPerMm],
  )

  useEffect(() => {
    if (phase !== 'test') return
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
      const d = map[e.key]
      if (d) {
        e.preventDefault()
        answer(d)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, answer])

  if (phase === 'cover') {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <EyeIcon className="size-16 text-(--bionis-blue)" aria-hidden="true" />
        <p className="max-w-xl text-2xl font-semibold leading-snug">{vt(lang, eye === 'right' ? 'coverLeft' : 'coverRight')}</p>
        <Button type="button" autoFocus className="h-12 px-6 text-base" onClick={() => setPhase('test')}>
          {vt(lang, 'start')}
        </Button>
      </div>
    )
  }

  const lvl = LOGMAR_LEVELS[Math.min(state.levelIndex, LOGMAR_LEVELS.length - 1)]
  const size = optotypeHeightPx(distanceMm, lvl, pxPerMm)
  const arrows: Array<[Direction, typeof ArrowUpIcon, VisionKey]> = [
    ['up', ArrowUpIcon, 'dirUp'],
    ['left', ArrowLeftIcon, 'dirLeft'],
    ['right', ArrowRightIcon, 'dirRight'],
    ['down', ArrowDownIcon, 'dirDown'],
  ]
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-medium">{vt(lang, 'testing', { eye: vt(lang, eye === 'right' ? 'eyeRight' : 'eyeLeft') })}</p>
      <p className="text-center text-sm text-muted-foreground">{vt(lang, 'acuityHelp')}</p>
      <div className="flex h-72 w-full max-w-xl items-center justify-center overflow-hidden rounded-xl bg-white" role="img" aria-label="E">
        <TumblingE size={size} dir={dir} />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {vt(lang, 'level', { lvl: lvl.toFixed(1), n: state.correct + state.wrong + 1 })}
      </p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={vt(lang, 'acuityHelp')}>
        {arrows.map(([d, Icon, key]) => (
          <Button
            key={d}
            type="button"
            variant="outline"
            aria-label={vt(lang, key)}
            className={cn(
              'size-16 rounded-2xl [&_svg]:size-7!',
              d === 'up' && 'col-start-2',
              d === 'left' && 'col-start-1 row-start-2',
              d === 'right' && 'col-start-3 row-start-2',
              d === 'down' && 'col-start-2 row-start-3',
            )}
            onClick={() => answer(d)}
          >
            <Icon />
          </Button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Amsler grid (one eye)
// ---------------------------------------------------------------------------
function AmslerTest({
  eye,
  pxPerMm,
  value,
  onChange,
  onNext,
}: {
  eye: Eye
  pxPerMm: number
  value: AmslerAnswer
  onChange: (a: AmslerAnswer) => void
  onNext: () => void
}) {
  const { lang } = useI18n()
  const [phase, setPhase] = useState<'cover' | 'grid'>('cover')
  const [showFinder, setShowFinder] = useState(false)
  const [dot, setDot] = useState<boolean | null>(null)
  const [corners, setCorners] = useState<boolean | null>(null)
  const [wavy, setWavy] = useState<boolean | null>(null)
  const [cursor, setCursor] = useState<[number, number]>([10, 10])

  // Grid: 20×20 squares of ≈5 mm each, capped to fit the screen.
  const avail = typeof window !== 'undefined' ? Math.min(window.innerWidth - 64, window.innerHeight * 0.55) : 400
  const size = Math.max(240, Math.min(100 * pxPerMm, avail))
  const cell = size / GRID

  const setAnswer = (patch: Partial<AmslerAnswer>) => onChange({ ...value, ...patch })
  const toggle = (c: number, r: number) => {
    const has = value.marks.some(([x, y]) => x === c && y === r)
    setAnswer({ marks: has ? value.marks.filter(([x, y]) => !(x === c && y === r)) : [...value.marks, [c, r]] })
  }
  const onGridKey = (e: ReactKeyboardEvent) => {
    if (!wavy) return
    const [c, r] = cursor
    const moves: Record<string, [number, number]> = { ArrowUp: [c, r - 1], ArrowDown: [c, r + 1], ArrowLeft: [c - 1, r], ArrowRight: [c + 1, r] }
    if (moves[e.key]) {
      e.preventDefault()
      const [nc, nr] = moves[e.key]
      setCursor([Math.max(0, Math.min(GRID - 1, nc)), Math.max(0, Math.min(GRID - 1, nr))])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle(c, r)
    }
  }

  if (phase === 'cover') {
    // Blind-spot finder: the blind spot sits ~15° to the side, ≈94 mm at 35 cm.
    const offset = Math.min(94 * pxPerMm, (typeof window !== 'undefined' ? window.innerWidth : 800) - 120)
    return (
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <EyeIcon className="size-14 text-(--bionis-blue)" aria-hidden="true" />
        <p className="max-w-xl text-2xl font-semibold leading-snug">{vt(lang, eye === 'right' ? 'coverLeft' : 'coverRight')}</p>
        <p className="text-sm text-muted-foreground">{vt(lang, 'amslerDistance')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" autoFocus className="h-12 px-6 text-base" onClick={() => setPhase('grid')}>
            {vt(lang, 'start')}
          </Button>
          {eye === 'right' ? (
            <Button type="button" variant="outline" className="h-12" aria-expanded={showFinder} onClick={() => setShowFinder((v) => !v)}>
              {vt(lang, 'findDistance')}
            </Button>
          ) : null}
        </div>
        {showFinder ? (
          <div className="flex w-full flex-col items-center gap-3">
            <p className="max-w-xl text-sm text-muted-foreground">{vt(lang, 'findHelp')}</p>
            <div className="relative h-32 w-full overflow-hidden rounded-xl bg-black" aria-hidden="true">
              <span className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-white" style={{ left: 40 }} />
              <span className="absolute top-1/2 h-8 w-5 -translate-y-1/2 rounded-full bg-red-500" style={{ left: 40 + offset }} />
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const canNext = dot !== null && corners !== null && wavy !== null && (!wavy || value.marks.length > 0)
  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-center text-base font-medium">{vt(lang, 'amslerFix')}</p>
      <div className="rounded-xl bg-black p-3">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={vt(lang, 'tapWrong')}
          tabIndex={wavy ? 0 : -1}
          onKeyDown={onGridKey}
          className={cn('block outline-none focus-visible:ring-4 focus-visible:ring-(--ring)', wavy && 'cursor-crosshair')}
          onClick={(e) => {
            if (!wavy) return
            const rect = e.currentTarget.getBoundingClientRect()
            const c = Math.floor(((e.clientX - rect.left) / rect.width) * GRID)
            const r = Math.floor(((e.clientY - rect.top) / rect.height) * GRID)
            if (c >= 0 && r >= 0 && c < GRID && r < GRID) {
              setCursor([c, r])
              toggle(c, r)
            }
          }}
        >
          {value.marks.map(([c, r]) => (
            <rect key={`${c}-${r}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#ef4444" fillOpacity={0.6} />
          ))}
          {Array.from({ length: GRID + 1 }, (_, i) => (
            <g key={i} stroke="#ffffff" strokeWidth={1}>
              <line x1={i * cell} y1={0} x2={i * cell} y2={size} />
              <line x1={0} y1={i * cell} x2={size} y2={i * cell} />
            </g>
          ))}
          <circle cx={size / 2} cy={size / 2} r={Math.max(3, cell / 4)} fill="#ffffff" />
          {wavy ? (
            <rect x={cursor[0] * cell} y={cursor[1] * cell} width={cell} height={cell} fill="none" stroke="#38bdf8" strokeWidth={2} />
          ) : null}
        </svg>
      </div>
      <div className="flex w-full max-w-xl flex-col gap-4">
        <YesNo lang={lang} label={vt(lang, 'qDot')} value={dot} onChange={(v) => { setDot(v); setAnswer({ centerDot: v }) }} />
        <YesNo lang={lang} label={vt(lang, 'qCorners')} value={corners} onChange={(v) => { setCorners(v); setAnswer({ allCorners: v }) }} />
        <YesNo
          lang={lang}
          label={vt(lang, 'qWavy')}
          value={wavy}
          onChange={(v) => {
            setWavy(v)
            setAnswer({ distortion: v, marks: v ? value.marks : [] })
          }}
        />
        {wavy ? (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm" aria-live="polite">
            {vt(lang, 'tapWrong')} <span className="font-medium">{vt(lang, 'marked', { n: value.marks.length })}</span>
          </p>
        ) : null}
        <Button type="button" className="h-12 w-fit px-6 text-base" disabled={!canNext} onClick={onNext}>
          {vt(lang, 'next')}
        </Button>
      </div>
    </div>
  )
}

function MiniMap({ marks }: { marks: [number, number][] }) {
  return (
    <svg viewBox="0 0 20 20" className="size-16 rounded bg-black" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={0.15}>
          <line x1={i * 5} y1={0} x2={i * 5} y2={20} />
          <line x1={0} y1={i * 5} x2={20} y2={i * 5} />
        </g>
      ))}
      {marks.map(([c, r]) => (
        <rect key={`${c}-${r}`} x={c} y={r} width={1} height={1} fill="#ef4444" />
      ))}
      <circle cx={10} cy={10} r={0.6} fill="#ffffff" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// The flow
// ---------------------------------------------------------------------------
export function VisionCheckFlow({
  crewId,
  full,
  onClose,
  onComplete,
}: {
  crewId: string
  full: boolean
  onClose: () => void
  onComplete: (outcome: VisionOutcome, ranAcuity: boolean) => void
}) {
  const { lang } = useI18n()
  useWakeLock(true)
  const [calibration, setCalibration] = useState<Calibration | null>(() => loadCalibration())
  const [skippedCal, setSkippedCal] = useState<DistanceMode | null>(null)
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = []
    if (!loadCalibration()) s.push('calibrate')
    if (full) s.push('right', 'left')
    s.push('amslerR', 'amslerL', 'questions', 'result')
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [i, setI] = useState(0)
  const step = steps[i]
  const next = () => setI((n) => Math.min(n + 1, steps.length - 1))

  const [acuity, setAcuity] = useState<Partial<Record<Eye, AcuityState>>>({})
  const [amsler, setAmsler] = useState<Record<Eye, AmslerAnswer>>({ right: EMPTY_AMSLER, left: EMPTY_AMSLER })
  const [worseAns, setWorse] = useState<WorseAnswer | null>(null)
  const [red, setRed] = useState<boolean | null>(null)
  const [result, setResult] = useState<VisionOutcome | null>(null)

  const mode: DistanceMode = calibration?.mode ?? skippedCal ?? 'phone40'
  const pxPerMm = calibration?.pxPerMm ?? DEFAULT_PX_PER_MM
  const calibrated = Boolean(calibration) && !skippedCal
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Compute and save once when the result step is reached.
  useEffect(() => {
    if (step !== 'result' || result) return
    const record = loadCrewVision(crewId)
    const session = {
      mode,
      calibrated,
      acuity: full
        ? { right: acuity.right?.passed ?? null, left: acuity.left?.passed ?? null }
        : undefined,
      amsler,
      worse: worseAns ?? 'no',
      redFlags: Boolean(red),
    }
    const outcome = assessVision(session, record.baseline)
    saveCrewVision(crewId, {
      baseline: updateBaseline(record.baseline, session),
      lastFullAt: full ? Date.now() : record.lastFullAt,
      last: { at: Date.now(), outcome },
    })
    setResult(outcome)
    onComplete(outcome, full)
  }, [step, result, crewId, mode, calibrated, full, acuity, amsler, worseAns, red, onComplete])

  const skippedLevels = [...new Set([...(acuity.right?.skipped ?? []), ...(acuity.left?.skipped ?? [])])].sort((a, b) => b - a)

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 p-0 sm:p-4" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vision-title"
        tabIndex={-1}
        className="bionis-dashboard flex w-full max-w-4xl flex-col overflow-hidden bg-background outline-none sm:rounded-2xl"
      >
        <div className="flex flex-col gap-3 border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <EyeIcon className="size-5 shrink-0" aria-hidden="true" />
              <h2 id="vision-title" className="truncate text-lg font-medium">
                {vt(lang, 'title')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <ScreeningTag lang={lang} />
              <Button type="button" variant="ghost" size="icon" aria-label={vt(lang, 'close')} onClick={onClose}>
                <XIcon />
              </Button>
            </div>
          </div>
          {/* Progress through the sub-steps of this run */}
          <ol className="flex gap-1.5" aria-label={vt(lang, 'progress', { n: i + 1, total: steps.length, name: vt(lang, STEP_LABEL[step]) })}>
            {steps.map((s, k) => (
              <li key={s} className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn('h-1.5 rounded-full', k < i ? 'bg-(--live)' : k === i ? 'bg-(--bionis-blue)' : 'bg-muted')} />
                <span className={cn('truncate text-xxs', k === i ? 'font-medium text-foreground' : 'text-muted-foreground')} aria-current={k === i ? 'step' : undefined}>
                  {vt(lang, STEP_LABEL[s])}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {step === 'calibrate' ? (
            <CalibrationPanel
              initial={calibration}
              onDone={(c) => {
                saveCalibration(c)
                setCalibration(c)
                setSkippedCal(null)
                next()
              }}
              onSkip={(m) => {
                setSkippedCal(m)
                next()
              }}
            />
          ) : null}

          {step === 'right' || step === 'left' ? (
            <AcuityTest
              key={step}
              eye={step}
              distanceMm={DISTANCE_MM[mode]}
              pxPerMm={pxPerMm}
              onDone={(s) => {
                setAcuity((a) => ({ ...a, [step]: s }))
                next()
              }}
            />
          ) : null}

          {step === 'amslerR' || step === 'amslerL' ? (
            <AmslerTest
              key={step}
              eye={step === 'amslerR' ? 'right' : 'left'}
              pxPerMm={pxPerMm}
              value={amsler[step === 'amslerR' ? 'right' : 'left']}
              onChange={(v) => setAmsler((a) => ({ ...a, [step === 'amslerR' ? 'right' : 'left']: v }))}
              onNext={next}
            />
          ) : null}

          {step === 'questions' ? (
            <div className="flex max-w-xl flex-col gap-6">
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-base font-medium">{vt(lang, 'q1')}</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={vt(lang, 'q1')}>
                  {(['no', 'little', 'clearly'] as WorseAnswer[]).map((w) => (
                    <Button
                      key={w}
                      type="button"
                      role="radio"
                      aria-checked={worseAns === w}
                      variant={worseAns === w ? 'default' : 'outline'}
                      className="h-12 min-w-28 text-base"
                      onClick={() => setWorse(w)}
                    >
                      {vt(lang, w === 'no' ? 'q1No' : w === 'little' ? 'q1Little' : 'q1Clearly')}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <YesNo lang={lang} label={vt(lang, 'q2')} value={red} onChange={setRed} />
              <Button type="button" className="h-12 w-fit px-6 text-base" disabled={worseAns === null || red === null} onClick={next}>
                {vt(lang, 'finish')}
              </Button>
            </div>
          ) : null}

          {step === 'result' && result ? (
            <div className="flex flex-col gap-5" aria-live="polite">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-medium">{vt(lang, 'resTitle')}</h3>
                <Pill level={result.level}>{vt(lang, `level.${result.level}` as VisionKey)}</Pill>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(['right', 'left'] as Eye[]).map((e) => {
                  const a = result.acuity?.[e]
                  return (
                    <article key={e} className="flex flex-col gap-3 rounded-2xl border p-4">
                      <p className="font-medium">{vt(lang, e === 'right' ? 'stepRight' : 'stepLeft')}</p>
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm">
                          <p className="text-muted-foreground">{vt(lang, 'resAcuity')}</p>
                          <p className="font-semibold tabular-nums">
                            {a === undefined
                              ? vt(lang, 'resNotRun')
                              : a === null
                                ? vt(lang, 'resBelow')
                                : `logMAR ${a.toFixed(1)} · ${snellen(a).us} · ${snellen(a).metric}`}
                          </p>
                          {a !== undefined && !calibrated ? <p className="text-xs text-(--chart-warn)">{vt(lang, 'resUncal')}</p> : null}
                          <p className="mt-2 text-muted-foreground">{vt(lang, 'resAmsler')}</p>
                          <p className={cn('font-semibold', amsler[e].distortion || !amsler[e].centerDot || !amsler[e].allCorners ? levelText.alert : 'text-(--vital-good)')}>
                            {amsler[e].distortion || !amsler[e].centerDot || !amsler[e].allCorners ? vt(lang, 'resIssue') : vt(lang, 'resClean')}
                          </p>
                        </div>
                        <MiniMap marks={amsler[e].marks} />
                      </div>
                    </article>
                  )
                })}
              </div>
              {skippedLevels.length ? (
                <p className="text-xs text-muted-foreground">{vt(lang, 'skippedNote', { levels: skippedLevels.map((l) => l.toFixed(1)).join(', ') })}</p>
              ) : null}
              <p className="text-sm font-medium text-(--live)" role="status">
                {vt(lang, 'saved')}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" autoFocus className="h-12 px-6 text-base" onClick={onClose}>
                  {vt(lang, 'close')}
                </Button>
                <ScreeningTag lang={lang} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
