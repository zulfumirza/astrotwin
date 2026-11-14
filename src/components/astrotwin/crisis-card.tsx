// Crisis mode: when a crew member is at CRITICAL tier, one large, high-contrast
// action card sits above everything else. It answers three things only:
// what happened, what to do now (1–3 steps), and where the report to Earth is.
import { SirenIcon } from 'lucide-react'
import { useI18n } from '../../i18n'
import { findingText } from '../../i18n/findings'
import { useMission, useNow } from '../../state/mission'
import { useDashboardNavigation } from '../bionis/navigation'

export function CrisisCard() {
  const { t, lang } = useI18n()
  const { navigate } = useDashboardNavigation()
  const { current, assessments, reports, transitLeftMs, setSelectedId, delaySec } = useMission()
  const now = useNow(1000)

  // The selected crew member first; otherwise anyone on board who is critical.
  const a = current.tier === 'critical' ? current : assessments.find((x) => x.tier === 'critical')
  if (!a) return null

  const top = a.findings.find((f) => f.level === 'critical') ?? a.findings[0]
  const text = findingText(top, lang)
  const steps = (text.steps ?? [text.action]).slice(0, 3)
  const others = a.findings.filter((f) => f !== top)

  const span = (ms: number) => {
    const sec = Math.ceil(ms / 1000)
    return sec >= 60 ? t('crisis.min', { n: Math.ceil(sec / 60) }) : t('crisis.sec', { n: Math.max(1, sec) })
  }
  const report = reports.find((r) => r.crewId === a.crewId && r.tier === 'critical')
  const left = report ? transitLeftMs(report, now) : 0
  const reportLine = !report
    ? t('crisis.queued')
    : left > 0
      ? t('crisis.sent', { time: span(left) })
      : t('crisis.received', { time: span(delaySec * 1000) })

  return (
    <section
      role="alert"
      aria-labelledby="crisis-title"
      className="mb-8 rounded-2xl bg-[#b91c1c] p-5 text-white shadow-lg md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#b91c1c]">
            <SirenIcon className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-wide">
              <span className="uppercase">{t('crisis.label')}</span> · {a.name}
            </p>
            <h2 id="crisis-title" className="text-2xl leading-tight font-semibold md:text-3xl">
              {text.title}
            </h2>
            <p className="mt-2 max-w-3xl text-base leading-snug">{text.what}</p>
          </div>
        </div>
        {a.crewId !== current.crewId ? (
          <button
            type="button"
            onClick={() => setSelectedId(a.crewId)}
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#b91c1c] outline-none hover:bg-white/90 focus-visible:ring-[3px] focus-visible:ring-white/70"
          >
            {t('crisis.view', { name: a.name })}
          </button>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl bg-white p-4 text-[#0f172a]">
        <p className="text-sm font-semibold text-[#b91c1c] uppercase">{t('crisis.now')}</p>
        <ol className="mt-2 flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-lg leading-snug font-medium">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#b91c1c] text-sm font-semibold text-white">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-4 text-base font-medium" aria-live="off">
        {reportLine}
      </p>

      <details className="mt-3 rounded-xl bg-black/20 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold outline-none focus-visible:underline">
          {t('crisis.details')}
        </summary>
        <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            <span className="font-semibold">{t('crisis.why')}: </span>
            {text.why}
          </p>
          {others.length > 0 ? (
            <div>
              <p className="font-semibold">{t('crisis.other')}</p>
              <ul className="mt-1 list-disc pl-5">
                {others.slice(0, 6).map((f) => (
                  <li key={f.id}>{findingText(f, lang).title}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => navigate('/surgeon')}
            className="w-fit rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[#b91c1c] outline-none hover:bg-white/90 focus-visible:ring-[3px] focus-visible:ring-white/70"
          >
            {t('compound.open')}
          </button>
        </div>
      </details>
    </section>
  )
}
