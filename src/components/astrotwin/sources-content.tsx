// Data & Sources: what is live, what our logic is based on, what is simulated.
import { ExternalLinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DOSE_RATE_MSV_PER_DAY, METRICS, type MetricId } from '../../engine'
import { useI18n } from '../../i18n'
import { st, type SourcesKey } from '../../i18n/sources'
import type { DataSource } from '../../services/http'
import { useMission } from '../../state/mission'
import { PageHeader, SourceBadge } from './ui'

type Tone = 'live' | 'reference' | 'simulated'
const TONE: Record<Tone, { tag: string; border: string; bg: string }> = {
  live: { tag: 'bg-(--live)/15 text-(--live)', border: 'border-(--live)/40', bg: 'bg-[linear-gradient(180deg,rgb(16_185_129/0.08)_0%,transparent_40%)]' },
  reference: { tag: 'bg-(--bionis-blue)/15 text-(--bionis-blue)', border: 'border-(--bionis-blue)/40', bg: 'bg-[linear-gradient(180deg,rgb(8_134_253/0.08)_0%,transparent_40%)]' },
  simulated: { tag: 'bg-(--chart-warn-bg) text-(--chart-warn)', border: 'border-(--chart-warn)/40', bg: 'bg-[linear-gradient(180deg,rgb(245_158_11/0.08)_0%,transparent_40%)]' },
}

function Section({ tone, title, sub, tag, children }: { tone: Tone; title: string; sub: string; tag: string; children: React.ReactNode }) {
  return (
    <section className={cn('flex flex-col gap-4 rounded-2xl border-2 p-5', TONE[tone].border, TONE[tone].bg)} aria-labelledby={`src-${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={`src-${tone}`} className="text-lg font-medium">
            {title}
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">{sub}</p>
        </div>
        <span className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide', TONE[tone].tag)}>{tag}</span>
      </div>
      {children}
    </section>
  )
}

const LinkOut = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 break-all text-sm underline-offset-4 hover:underline">
    <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
    {children}
  </a>
)

export function SourcesContent() {
  const { lang } = useI18n()
  const { protons, recentEvents, gleEvents, marsRange, assessments } = useMission()
  const s = (k: SourcesKey, p?: Record<string, string | number>) => st(lang, k, p)
  const time = (at?: number) => (at ? new Date(at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB') : s('notYet'))

  const live: Array<{ id: 'donki' | 'swpc' | 'horizons'; endpoints: string[]; route: string; site: string; status: Array<{ source: DataSource; at?: number } | null> }> = [
    {
      id: 'donki',
      endpoints: ['https://api.nasa.gov/DONKI/SEP', 'https://api.nasa.gov/DONKI/CME', 'https://api.nasa.gov/DONKI/FLR', 'https://api.nasa.gov/DONKI/notifications'],
      route: '/api/donki',
      site: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
      status: [recentEvents ? { source: recentEvents.source, at: recentEvents.fetchedAt } : null, gleEvents ? { source: gleEvents.source, at: gleEvents.fetchedAt } : null],
    },
    {
      id: 'swpc',
      endpoints: ['https://services.swpc.noaa.gov/json/goes/primary/integral-protons-6-hour.json'],
      route: '/api/swpc',
      site: 'https://www.swpc.noaa.gov/products/goes-proton-flux',
      status: [protons ? { source: protons.source, at: protons.fetchedAt } : null],
    },
    {
      id: 'horizons',
      endpoints: ['https://ssd.jpl.nasa.gov/api/horizons.api'],
      route: '/api/horizons',
      site: 'https://ssd.jpl.nasa.gov/horizons/',
      status: [{ source: marsRange.source, at: marsRange.fetchedAt }],
    },
  ]

  // Each reference: official / peer-reviewed links, or a written citation where no link is used.
  const refs: Array<{ id: string; links?: string[]; cite?: string[] }> = [
    { id: 'hrp', links: ['https://www.nasa.gov/hrp/hazards/'] },
    { id: 'risks', links: ['https://www.nasa.gov/hrp/risks/'] },
    { id: 'std', links: ['https://www.nasa.gov/reference/standard-measures/', 'https://ntrs.nasa.gov/citations/20190000670'] },
    {
      id: 'pvt',
      links: [
        'https://www.med.upenn.edu/uep/cognition.html',
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC4691281/',
        'https://spinoff.nasa.gov/Spinoff2013/hm_1.html',
      ],
    },
    {
      id: 'kss',
      cite: [
        'Åkerstedt T, Gillberg M (1990). Subjective and objective sleepiness in the active individual. Int J Neurosci 52:29–37.',
        'Validation: Kaida K, et al. (2006). Clin Neurophysiol 117:1574–81. doi:10.1016/j.clinph.2006.03.011',
      ],
    },
    { id: 'vision', links: ['https://ntrs.nasa.gov/citations/20180004916', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10445111/'] },
    { id: 'apex', links: ['https://ntrs.nasa.gov/citations/20260002661'] },
    { id: 'osdr', links: ['https://osdr.nasa.gov/bio/repo/'] },
    { id: 'nlsp', links: ['https://nlsp.nasa.gov/'] },
    { id: 'csa', links: ['https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp'] },
  ]

  // Simulated items: ranges come straight from the engine so this table never drifts.
  const baselineRange = (id: MetricId) => {
    const v = assessments.map((a) => a.metrics[id].baseline.mean)
    const d = METRICS[id].digits
    return `${Math.min(...v).toFixed(d)}–${Math.max(...v).toFixed(d)} ${METRICS[id].unit}`
  }
  const limits = (id: MetricId) => {
    const m = METRICS[id]
    const earth = m.earth[1] >= 999 ? '—' : `${m.earth[0]}–${m.earth[1]} ${m.unit}`
    if (!m.limits) return earth
    const sign = m.limits.dir === 'high' ? '≥' : '<'
    const parts = [`${s('limitWatch')} ${sign}${m.limits.watch}`]
    if (m.limits.alert !== undefined) parts.push(`${s('limitAlert')} ${sign}${m.limits.alert}`)
    return `${earth} · ${parts.join(', ')}`
  }
  const sim: Array<{ label: string; range: string; limits: string; basis: SourcesKey }> = [
    ...(['restHr', 'sysBp', 'diaBp', 'spo2', 'tempC', 'glucose', 'hrv'] as MetricId[]).map((id) => ({
      label: METRICS[id] ? id : id,
      range: baselineRange(id),
      limits: limits(id),
      basis: 'basisVitals' as SourcesKey,
    })),
    { label: 'sleepH', range: baselineRange('sleepH'), limits: limits('sleepH'), basis: 'basisSleep' },
    { label: 'exerciseMin', range: baselineRange('exerciseMin'), limits: limits('exerciseMin'), basis: 'basisActivity' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={s('title')} subtitle={s('sub')} />

      <Section tone="live" title={s('liveTitle')} sub={s('liveSub')} tag={s('live')}>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {live.map((l) => (
            <article key={l.id} className="flex flex-col gap-3 rounded-xl border bg-background p-4">
              <h3 className="font-medium">{s(`${l.id}.name` as SourcesKey)}</h3>
              <dl className="flex flex-col gap-2 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">{s('whatFor')}</dt>
                  <dd>{s(`${l.id}.what` as SourcesKey)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">{s('endpoint')}</dt>
                  <dd className="flex flex-col gap-0.5 font-mono text-xs break-all">
                    {l.endpoints.map((e) => (
                      <span key={e}>{e}</span>
                    ))}
                    <span className="text-muted-foreground">→ {l.route}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">{s('lastFetch')}</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    {l.status.map((x, i) =>
                      x ? (
                        <span key={i} className="flex items-center gap-2">
                          <SourceBadge source={x.source} at={x.at} className="bg-muted" />
                          <span className="text-xs text-muted-foreground">{time(x.at)}</span>
                        </span>
                      ) : (
                        <span key={i} className="text-xs text-muted-foreground">
                          {s('notYet')}
                        </span>
                      ),
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">{s('usedIn')}</dt>
                  <dd>{s(`${l.id}.used` as SourcesKey)}</dd>
                </div>
              </dl>
              <LinkOut href={l.site}>{s('open')}</LinkOut>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="reference" title={s('refTitle')} sub={s('refSub')} tag={s('reference')}>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {refs.map((r) => (
            <li key={r.id} className="flex flex-col gap-1.5 rounded-xl border bg-background p-4">
              <p className="font-medium">{s(`${r.id}.name` as SourcesKey)}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{s('howUsed')}: </span>
                {s(`${r.id}.how` as SourcesKey)}
              </p>
              {r.links?.map((href) => (
                <LinkOut key={href} href={href}>
                  {href.replace('https://', '')}
                </LinkOut>
              ))}
              {r.cite?.map((c) => (
                <p key={c} className="text-xs leading-relaxed text-muted-foreground">
                  {c}
                </p>
              ))}
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="simulated" title={s('simTitle')} sub={s('simSub')} tag={s('simulated')}>
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">{s('simItem')}</th>
                <th scope="col" className="px-3 py-2 font-medium">{s('simRange')}</th>
                <th scope="col" className="px-3 py-2 font-medium">{s('simLimits')}</th>
                <th scope="col" className="px-3 py-2 font-medium">{s('simBasis')}</th>
              </tr>
            </thead>
            <tbody>
              {sim.map((row) => (
                <tr key={row.label} className="border-t align-top">
                  <th scope="row" className="px-3 py-2 font-medium">
                    <MetricName id={row.label as MetricId} />
                  </th>
                  <td className="px-3 py-2 tabular-nums">{row.range}</td>
                  <td className="px-3 py-2 tabular-nums">{row.limits}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s(row.basis)}</td>
                </tr>
              ))}
              <tr className="border-t align-top">
                <th scope="row" className="px-3 py-2 font-medium">{s('doseItem')}</th>
                <td className="px-3 py-2 tabular-nums">
                  LEO {DOSE_RATE_MSV_PER_DAY.leo} · Moon {DOSE_RATE_MSV_PER_DAY.moon} · Mars {DOSE_RATE_MSV_PER_DAY.mars} mSv{s('perDay')}
                </td>
                <td className="px-3 py-2 tabular-nums">600 mSv</td>
                <td className="px-3 py-2 text-muted-foreground">{s('basisDose')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm font-medium">{s('footer')}</p>
    </div>
  )
}

function MetricName({ id }: { id: MetricId }) {
  const { t } = useI18n()
  return <>{t(`metric.${id}`)}</>
}
