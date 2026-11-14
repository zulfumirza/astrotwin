import { useState } from 'react'
import { LockIcon, SendIcon } from 'lucide-react'
import { ReportsIcon } from '../bionis/icons'
import { useDashboardNavigation } from '../bionis/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDelay, SBAR_KEYS, type Tier } from '../../engine'
import { useI18n } from '../../i18n'
import { TIER_NAMES } from '../../i18n/findings'
import { useMission, useNow, type Report } from '../../state/mission'
import { PageHeader, Pill, SimBadge, SimulatedBadge, SourceBadge, tierLevel, Toggle } from './ui'
import { useNarration } from './use-narration'

const TIERS: Tier[] = ['routine', 'anomaly', 'critical']

export function ReportsContent() {
  const { t, lang } = useI18n()
  const { navigate } = useDashboardNavigation()
  const { current, privacy, setPrivacy, sendReport, delaySec } = useMission()
  const { payload, sbar, source } = useNarration()
  const [sent, setSent] = useState(false)

  const send = () => {
    sendReport({
      crewId: current.crewId,
      name: current.name,
      day: current.day,
      tier: current.tier,
      sbar,
      narrator: source,
      lang,
      withheld: payload.withheld,
      auto: false,
    })
    setSent(true)
    window.setTimeout(() => setSent(false), 2500)
  }

  const exportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ generatedAt: new Date().toISOString(), simulated: true, payload, sbar }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `astrotwin-sbar-${current.crewId}-day${current.day}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} />
      <SimBadge />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <article
            key={tier}
            className={cn(
              'flex flex-col gap-3 rounded-2xl border bg-background p-5',
              current.tier === tier && 'border-foreground/40',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-(--chart-period-bg) text-(--chart-period)">
                <ReportsIcon className="size-4" />
              </span>
              <Pill level={tierLevel[tier]} className="px-2.5 text-xs">
                {current.tier === tier ? t('reports.currentTier') : TIER_NAMES[lang][tier]}
              </Pill>
            </div>
            <h2 className="font-medium">{TIER_NAMES[lang][tier]}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t(`reports.tier.${tier}`)}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="flex flex-col gap-5 rounded-2xl border bg-background p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium">
              SBAR · {current.name} · {t('twin.day', { day: current.day })}
            </h2>
            <div className="flex items-center gap-2">
              <Pill level={tierLevel[current.tier]} className="px-2.5 text-xs">
                {TIER_NAMES[lang][current.tier]}
              </Pill>
              <SimulatedBadge />
              <SourceBadge source={source} />
            </div>
          </div>
          <dl className="flex flex-col gap-2">
            {SBAR_KEYS.filter((k) => k !== 'crewMessage').map((k) => (
              <div key={k} className="flex flex-col gap-1.5 rounded-xl bg-muted px-3.5 py-3">
                <dt className="text-xs font-medium text-muted-foreground">{t(`sbar.${k}`)}</dt>
                <dd className="text-sm leading-relaxed">{sbar[k]}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={send}>
              <SendIcon />
              {t('reports.send')}
            </Button>
            <Button type="button" variant="outline" onClick={exportJson}>
              {t('reports.export')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/mission-control')}>
              {t('reports.openMc')}
            </Button>
            <span className="text-sm font-medium text-(--live)" role="status">
              {sent ? t('reports.sent', { delay: formatDelay(delaySec) }) : ''}
            </span>
          </div>
        </article>

        <article className="flex flex-col gap-4 rounded-2xl border bg-background p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--insight-prediction) text-white">
              <LockIcon className="size-4" />
            </span>
            <h2 className="font-medium">{t('privacy.title')}</h2>
          </div>
          <Toggle
            checked={privacy.shareBehavioral}
            onChange={(v) => setPrivacy({ shareBehavioral: v })}
            label={t('privacy.toggle')}
            description={t('privacy.toggleSub')}
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {payload.privacyApplied
              ? t('privacy.applied', { count: payload.withheld })
              : current.tier === 'critical'
                ? t('privacy.critical')
                : t('privacy.sharing')}
          </p>
        </article>
      </section>
    </div>
  )
}

function TransitRow({ report, now }: { report: Report; now: number }) {
  const { t, lang } = useI18n()
  const { transitLeftMs } = useMission()
  const left = transitLeftMs(report, now)
  const total = report.delaySec * 1000
  const arrived = left <= 0
  const pct = total > 0 ? Math.round(((total - left) / total) * 100) : 100
  const mm = Math.floor(left / 60000)
  const ss = Math.floor((left % 60000) / 1000)
  const sentTime = new Date(report.sentAt).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-GB')

  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <Pill level={tierLevel[report.tier]} className="px-2.5 text-xs">
            {TIER_NAMES[lang][report.tier]}
          </Pill>
          <p className="truncate font-medium">
            {report.name} · {t('twin.day', { day: report.day })}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {t('mc.sentAt', { time: sentTime })} · {report.auto ? t('mc.auto') : t('mc.manual')} ·{' '}
          {report.narrator === 'live' ? 'Gemini' : t('mc.template')}
        </span>
      </div>

      {arrived ? (
        <dl className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {SBAR_KEYS.filter((k) => k !== 'crewMessage').map((k) => (
            <div key={k} className="flex flex-col gap-1.5 rounded-xl bg-muted px-3 py-2.5">
              <dt className="text-xs font-medium text-muted-foreground">{t(`sbar.${k}`)}</dt>
              <dd className="text-sm leading-relaxed">{report.sbar[k]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="space-y-2 rounded-xl bg-muted/60 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('mc.inTransit')}</span>
            <span className="tabular-nums text-muted-foreground">
              {t('mc.arrivesIn', { time: `${mm}:${String(ss).padStart(2, '0')}` })}
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-background"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={t('mc.inTransit')}
          >
            <div className="h-full rounded-full bg-(--bionis-blue)" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {report.withheld > 0 ? (
        <p className="text-xs text-muted-foreground">{t('privacy.applied', { count: report.withheld })}</p>
      ) : null}
    </article>
  )
}

export function MissionControlContent() {
  const { t } = useI18n()
  const { reports, delaySec, profile, marsRange, fastForward, setFastForward, transitLeftMs } = useMission()
  const now = useNow(500)
  const inTransit = reports.filter((r) => transitLeftMs(r, now) > 0).length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('mc.title')}
        subtitle={t('mc.subtitle')}
        right={
          <Button type="button" variant={fastForward ? 'default' : 'outline'} aria-pressed={fastForward} onClick={() => setFastForward(!fastForward)}>
            {t('mc.fast')}
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium tracking-tight">{t('mc.oneWay')}</p>
            {profile === 'mars' ? <SourceBadge source={marsRange.source} at={marsRange.fetchedAt} className="bg-muted" /> : null}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-2.5xl font-medium leading-none tabular-nums">{formatDelay(delaySec)}</p>
            <p className="text-xs text-muted-foreground">{t(`profile.${profile}`)}</p>
          </div>
        </article>
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <p className="text-sm font-medium tracking-tight">{t('mc.roundTrip')}</p>
          <div className="flex flex-col gap-2">
            <p className="text-2.5xl font-medium leading-none tabular-nums">{formatDelay(delaySec * 2)}</p>
            <p className="text-xs text-muted-foreground">{t('mc.roundTripSub')}</p>
          </div>
        </article>
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <p className="text-sm font-medium tracking-tight">{t('mc.distance')}</p>
          <div className="flex flex-col gap-2">
            <p className="leading-none">
              <span className="text-2.5xl font-medium tabular-nums">
                {profile === 'mars' ? marsRange.data.au.toFixed(3) : profile === 'moon' ? '384,400' : '420'}
              </span>{' '}
              <span className="font-normal">{profile === 'mars' ? 'AU' : 'km'}</span>
            </p>
            <p className="text-xs text-muted-foreground">{profile === 'mars' ? t('mc.distanceSub') : t('mc.distanceFixed')}</p>
          </div>
        </article>
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <p className="text-sm font-medium tracking-tight">{t('mc.queue')}</p>
          <div className="flex flex-col gap-2">
            <p className="leading-none">
              <span className="text-2.5xl font-medium tabular-nums">{inTransit}</span>{' '}
              <span className="font-normal">/ {reports.length}</span>
            </p>
            <p className="text-xs text-muted-foreground">{t('mc.queueSub')}</p>
          </div>
        </article>
      </section>

      <div className="flex flex-col gap-3">
        {reports.length === 0 ? (
          <div className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">{t('mc.empty')}</div>
        ) : (
          reports.map((r) => <TransitRow key={r.id} report={r} now={now} />)
        )}
      </div>
    </div>
  )
}
