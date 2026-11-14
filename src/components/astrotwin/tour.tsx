// Guided tour: dims the whole screen and leaves only the current section lit
// (a "spotlight"), with Back / Next / Skip. Keyboard: ← → move, Esc closes.
// Starts automatically on the first visit; can be restarted from Help or Settings.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ht, type HelpKey } from '../../i18n/help'
import { useI18n } from '../../i18n'
import { useDashboardNavigation } from '../bionis/navigation'

interface TourStep {
  id: string
  /** Route to open before looking for the target. */
  path?: string
  /** `data-tour` value of the section to light up; none = centred card. */
  target?: string
  /** Skip the step when the target is not on screen (e.g. no crisis right now). */
  optional?: boolean
}

const STEPS: TourStep[] = [
  { id: 'welcome' },
  { id: 'crisis', path: '/', target: 'crisis', optional: true },
  { id: 'scenario', path: '/', target: 'scenario' },
  { id: 'crew', path: '/', target: 'crew' },
  { id: 'bodymap', path: '/', target: 'bodymap' },
  { id: 'hazards', path: '/', target: 'hazards' },
  { id: 'dailycheck', path: '/check', target: 'dailycheck' },
  { id: 'twin', path: '/twin', target: 'twin' },
  { id: 'surgeon', path: '/surgeon', target: 'surgeon' },
  { id: 'radiation', path: '/radiation', target: 'radiation' },
  { id: 'privacy', path: '/reports', target: 'privacy' },
  { id: 'mc', path: '/mission-control', target: 'mc' },
  { id: 'lang', target: 'lang' },
  { id: 'help', target: 'help' },
]

const DONE_KEY = 'astrotwin:tour:done'
const EVENT = 'astrotwin:tour-start'

/** Start (or restart) the tour from anywhere. */
export function startTour(_navigate?: unknown) {
  window.dispatchEvent(new Event(EVENT))
}

const PAD = 8

export function GuidedTour() {
  const { lang } = useI18n()
  const { navigate } = useDashboardNavigation()
  const [index, setIndex] = useState<number | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [missing, setMissing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const dirRef = useRef(1)
  const step = index === null ? null : STEPS[index]

  const close = useCallback(() => {
    setIndex(null)
    setRect(null)
    try {
      localStorage.setItem(DONE_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  // Start on request, and automatically on the first visit.
  useEffect(() => {
    const onStart = () => {
      dirRef.current = 1
      setIndex(0)
    }
    window.addEventListener(EVENT, onStart)
    let seen = false
    try {
      seen = localStorage.getItem(DONE_KEY) === '1'
    } catch {
      seen = true
    }
    const timer = seen ? undefined : window.setTimeout(onStart, 1200)
    return () => {
      window.removeEventListener(EVENT, onStart)
      window.clearTimeout(timer)
    }
  }, [])

  // Go to the step's screen, then wait for its section to appear and light it up.
  useEffect(() => {
    if (!step) return
    setRect(null)
    setMissing(false)
    if (step.path) navigate(step.path)
    if (!step.target) return
    let tries = 0
    let frame = 0
    const find = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'auto' })
        // Measure right away (rAF does not run in background tabs), then once more after layout settles.
        setRect(el.getBoundingClientRect())
        frame = window.setTimeout(() => setRect(el.getBoundingClientRect()), 120) as unknown as number
        return
      }
      if (++tries < 15) {
        frame = window.setTimeout(find, 100) as unknown as number
        return
      }
      // Not on screen right now.
      if (step.optional) setIndex((i) => (i === null ? null : Math.max(0, Math.min(STEPS.length - 1, i + dirRef.current))))
      else setMissing(true)
    }
    frame = window.setTimeout(find, 60) as unknown as number
    return () => window.clearTimeout(frame)
  }, [step, navigate])

  // Keep the spotlight on the section while the page scrolls or resizes.
  useEffect(() => {
    if (!step?.target) return
    const update = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', update)
    document.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      document.removeEventListener('scroll', update, true)
    }
  }, [step])

  const go = useCallback(
    (delta: number) => {
      dirRef.current = delta
      setIndex((i) => {
        if (i === null) return null
        const n = i + delta
        if (n >= STEPS.length) {
          close()
          return null
        }
        return Math.max(0, n)
      })
    },
    [close],
  )

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, go, close])

  useLayoutEffect(() => {
    if (index !== null) cardRef.current?.focus()
  }, [index, rect])

  if (!step) return null
  const centred = !step.target || missing
  const ready = centred || rect

  // Card placement: below the lit section if there is room, otherwise above, clamped to the viewport.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardW = Math.min(360, vw - 32)
  let cardStyle: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: cardW }
  if (!centred && rect) {
    const below = rect.bottom + PAD + 12
    const fitsBelow = below + 220 < vh
    const top = fitsBelow ? below : Math.max(16, rect.top - PAD - 12 - 220)
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16)
    cardStyle = { left, top: Math.min(top, vh - 236), width: cardW }
  }
  const title = ht(lang, `${step.id}.title` as HelpKey)
  const body = ht(lang, `${step.id}.body` as HelpKey)
  const last = index === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      {/* Click-catcher: the page is not interactive while the tour is open. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {centred || !rect ? (
        <div className="absolute inset-0 bg-black/70" aria-hidden="true" />
      ) : (
        // Spotlight: a transparent hole whose huge shadow darkens everything else.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl ring-2 ring-white/80 transition-all duration-200"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72)',
          }}
        />
      )}
      {ready ? (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          tabIndex={-1}
          className="bionis-dashboard absolute flex flex-col gap-3 rounded-2xl border bg-background p-4 shadow-xl outline-none"
          style={cardStyle}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {ht(lang, 'stepOf', { n: (index ?? 0) + 1, total: STEPS.length })}
            </span>
            <button type="button" onClick={close} className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {ht(lang, 'skip')}
            </button>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-(--bionis-blue)" style={{ width: `${(((index ?? 0) + 1) / STEPS.length) * 100}%` }} />
          </div>
          <h2 id="tour-title" className="text-lg font-medium">
            {title}
          </h2>
          <p id="tour-body" className="text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="hidden text-xxs text-muted-foreground sm:inline">{ht(lang, 'keys')}</span>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" disabled={index === 0} onClick={() => go(-1)}>
                {ht(lang, 'back')}
              </Button>
              <Button type="button" onClick={() => go(1)}>
                {last ? ht(lang, 'finish') : ht(lang, 'next')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
