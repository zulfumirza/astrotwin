import { useEffect, useId, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PauseIcon, PlayIcon, RadiationIcon, RotateCcwIcon } from 'lucide-react'
import { AlertTriangleIcon, CalendarIcon } from '../bionis/icons'
import { ChartTooltip } from '../bionis/shared'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  CAREER_LIMIT_MSV,
  DOSE_RATE_MSV_PER_DAY,
  GLE74,
  gle74ProtonSeries,
  NEUTRON_FRACTION,
  S1_THRESHOLD_PFU,
  type ProtonPoint,
  type SpaceWeatherEvent,
} from '../../engine'
import { useI18n } from '../../i18n'
import type { Sourced } from '../../services/http'
import { useMission } from '../../state/mission'
import { AXIS_TICK, InfoButton, PageHeader, Pill, SimBadge, SimulatedBadge, SourceBadge, usePrefersReducedMotion } from './ui'

const hhmm = (iso: string) => iso.slice(11, 16)

function FluxChart({ points, clock, height = 'h-64' }: { points: ProtonPoint[]; clock?: string; height?: string }) {
  const { t } = useI18n()
  const id = useId().replace(/:/g, '')
  const data = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        ts: Date.parse(p.time),
        // log axis cannot draw zero
        p10: Math.max(p.p10, 0.05),
        p100: Math.max(p.p100, 0.05),
        label: `${p.time.slice(0, 10)} ${hhmm(p.time)} UT`,
      })),
    [points],
  )
  return (
    <div className={cn(height, 'w-full min-w-0')} role="img" aria-label={t('rad.chartAria')}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`p10-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-steps)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-steps)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => hhmm(new Date(v).toISOString())}
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            minTickGap={40}
          />
          <YAxis
            scale="log"
            domain={[0.05, (max: number) => Math.max(100, max * 2)]}
            ticks={[0.1, 1, 10, 100, 1000]}
            allowDataOverflow
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            width={44}
          />
          <ReferenceLine
            y={S1_THRESHOLD_PFU}
            stroke="var(--prediction-danger)"
            strokeDasharray="4 4"
            label={{ value: t('rad.s1'), position: 'insideTopLeft', fill: 'var(--prediction-danger)', fontSize: 10 }}
          />
          {clock ? <ReferenceLine x={Date.parse(clock)} stroke="var(--foreground)" strokeWidth={1.5} /> : null}
          <Tooltip
            cursor={{ stroke: 'var(--foreground)', strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.35 }}
            content={
              <ChartTooltip
                icon={CalendarIcon}
                items={[
                  { label: '≥10 MeV', dataKey: 'p10', formatValue: (v) => `${Number(v).toFixed(2)} pfu`, color: 'var(--chart-steps)' },
                  { label: '≥100 MeV', dataKey: 'p100', formatValue: (v) => `${Number(v).toFixed(2)} pfu`, color: 'var(--chart-sleep)' },
                ]}
              />
            }
          />
          <Area type="monotone" dataKey="p10" stroke="var(--chart-steps)" strokeWidth={2} fill={`url(#p10-${id})`} dot={false} isAnimationActive={false} />
          <Area type="monotone" dataKey="p100" stroke="var(--chart-sleep)" strokeWidth={1.5} strokeDasharray="8 6" fill="none" dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function EventList({ events, empty }: { events: Sourced<SpaceWeatherEvent[]> | null; empty: string }) {
  const { t } = useI18n()
  if (!events) return <p className="text-sm text-muted-foreground">{t('loading')}</p>
  if (events.data.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
      {events.data.slice(0, 40).map((e) => (
        <li key={e.id} className="flex items-start gap-3 rounded-xl bg-muted px-3 py-2">
          <span className="mt-0.5 w-10 shrink-0 rounded-md bg-background px-1.5 py-0.5 text-center text-xxs font-medium text-(--chart-period)">
            {e.type}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {e.link ? (
                <a href={e.link} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                  {e.title}
                </a>
              ) : (
                e.title
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {e.time.slice(0, 10)} · {hhmm(e.time)} UT
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function RadiationContent() {
  const { t } = useI18n()
  const reducedMotion = usePrefersReducedMotion()
  const {
    current, profile, protons, recentEvents, gleEvents, liveSep, sepActive,
    scenario, setScenario, stormClock, setStormClock, refreshSpaceWeather,
  } = useMission()
  const [playing, setPlaying] = useState(false)
  const replay = useMemo(() => gle74ProtonSeries(), [])
  const startMs = Date.parse(GLE74.replayStart)
  const endMs = Date.parse(GLE74.replayEnd)
  const clockMs = Date.parse(stormClock)
  const storm = scenario === 'storm'

  // Replay: 5 simulated minutes per tick.
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const next = Date.parse(stormClock) + 5 * 60_000
      if (next >= endMs) setPlaying(false)
      setStormClock(new Date(Math.min(next, endMs)).toISOString())
    }, reducedMotion ? 900 : 450)
    return () => window.clearInterval(timer)
  }, [playing, stormClock, endMs, reducedMotion, setStormClock])

  const latest = protons?.data[protons.data.length - 1]
  const todayDose = current.record.doseMsv

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('rad.title')}
        subtitle={t('rad.subtitle')}
        right={
          <Button type="button" variant="outline" onClick={refreshSpaceWeather}>
            <RotateCcwIcon />
            {t('rad.refresh')}
          </Button>
        }
      />
      <SimBadge />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium tracking-tight">{t('rad.today')}</p>
            <SimulatedBadge />
          </div>
          <div className="flex flex-col gap-2">
            <p className="leading-none">
              <span className="text-2.5xl font-medium tabular-nums">{todayDose.toFixed(2)}</span> <span className="font-normal">mSv</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t('rad.model', { rate: DOSE_RATE_MSV_PER_DAY[profile], profile: t(`profile.${profile}`) })}
            </p>
          </div>
        </article>
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium tracking-tight">{t('rad.cumulative')}</p>
              <InfoButton id="dose" name={t('metric.dose')} />
            </div>
            <SimulatedBadge />
          </div>
          <div className="flex flex-col gap-2">
            <p className="leading-none">
              <span className="text-2.5xl font-medium tabular-nums">{current.cumulativeDoseMsv.toFixed(1)}</span> <span className="font-normal">mSv</span>
            </p>
            <p className="text-xs text-muted-foreground">{t('rad.neutron', { pct: Math.round(NEUTRON_FRACTION * 100) })}</p>
          </div>
        </article>
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <p className="text-sm font-medium tracking-tight">{t('rad.career')}</p>
          <div className="flex flex-col gap-2">
            <p className="leading-none">
              <span className="text-2.5xl font-medium tabular-nums">{current.careerLimitPct.toFixed(1)}</span> <span className="font-normal">%</span>
            </p>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(current.careerLimitPct)} aria-label={t('rad.career')}>
              <div className="h-full rounded-full bg-(--metric-heart)" style={{ width: `${Math.min(100, current.careerLimitPct)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{t('rad.careerSub', { limit: CAREER_LIMIT_MSV })}</p>
          </div>
        </article>
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium tracking-tight">{t('rad.sepStatus')}</p>
            <Pill level={sepActive ? 'critical' : 'nominal'} className="px-2.5 text-xs">
              {sepActive ? t('rad.sepOn') : t('rad.sepOff')}
            </Pill>
          </div>
          <div className="flex flex-col gap-2">
            <p className="leading-none">
              <span className="text-2.5xl font-medium tabular-nums">{latest ? latest.p10.toFixed(2) : '—'}</span> <span className="font-normal">pfu</span>
            </p>
            <p className="text-xs text-muted-foreground">{liveSep ? t('rad.liveSep') : t('rad.sepSub')}</p>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="flex flex-col gap-4 rounded-2xl border bg-background p-4 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--chart-sleep) text-white">
                <RadiationIcon className="size-4.5" />
              </span>
              <h3 className="text-lg font-medium">{t('rad.flux')}</h3>
            </div>
            {protons ? <SourceBadge source={protons.source} at={protons.fetchedAt} className="bg-muted" /> : null}
          </div>
          {protons ? <FluxChart points={protons.data} /> : <p className="text-sm text-muted-foreground">{t('loading')}</p>}
          <p className="text-xs leading-relaxed text-muted-foreground">{t('rad.fluxNote')}</p>
        </article>

        <article className="flex flex-col gap-4 rounded-2xl border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{t('rad.recent')}</h3>
            {recentEvents ? <SourceBadge source={recentEvents.source} at={recentEvents.fetchedAt} className="bg-muted" /> : null}
          </div>
          <EventList events={recentEvents} empty={t('rad.recentEmpty')} />
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="flex flex-col gap-4 rounded-2xl border bg-[linear-gradient(180deg,rgb(247_46_46/0.08)_0%,transparent_42%)] p-4 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--insight-vitals) text-white">
                <AlertTriangleIcon className="size-4.5" />
              </span>
              <h3 className="text-lg font-medium">{t('rad.replay')}</h3>
            </div>
            <span className="inline-flex h-8 shrink-0 items-center rounded-xl bg-(--chart-period-bg) px-3 py-1 text-sm font-medium text-(--chart-period)">
              {hhmm(stormClock)} UT · 2024-05-11
            </span>
          </div>

          {storm ? (
            <>
              <FluxChart points={replay} clock={stormClock} height="h-56" />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => setPlaying(!playing)} aria-pressed={playing}>
                  {playing ? <PauseIcon /> : <PlayIcon />}
                  {playing ? t('rad.pause') : t('rad.play')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPlaying(false)
                    setStormClock(GLE74.replayStart)
                  }}
                >
                  {t('rad.rewind')}
                </Button>
                <label className="flex min-w-48 flex-1 items-center gap-3 text-sm">
                  <span className="sr-only">{t('rad.clock')}</span>
                  <input
                    type="range"
                    min={startMs}
                    max={endMs}
                    step={5 * 60_000}
                    value={clockMs}
                    onChange={(e) => setStormClock(new Date(Number(e.target.value)).toISOString())}
                    aria-valuetext={`${hhmm(stormClock)} UT`}
                    className="h-2 w-full cursor-pointer accent-(--bionis-blue)"
                  />
                </label>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2" role="status">
                <Pill level={sepActive ? 'critical' : 'nominal'} className="px-2.5 text-xs">
                  {sepActive ? t('rad.sepOn') : t('rad.sepOff')}
                </Pill>
                <p className="text-sm">{sepActive ? t('rad.replayOn') : t('rad.replayOff')}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{t('rad.replayIdle')}</p>
              <Button type="button" onClick={() => setScenario('storm')}>
                {t('rad.replayStart')}
              </Button>
            </div>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">{t('rad.replayNote')}</p>
        </article>

        <article className="flex flex-col gap-4 rounded-2xl border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{t('rad.gleEvents')}</h3>
            {gleEvents ? <SourceBadge source={gleEvents.source} at={gleEvents.fetchedAt} className="bg-muted" /> : null}
          </div>
          <EventList events={gleEvents} empty={t('rad.recentEmpty')} />
        </article>
      </section>
    </div>
  )
}
