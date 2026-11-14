import { useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarIcon, TrendsIcon } from '../bionis/icons'
import { ChartTooltip } from '../bionis/shared'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BASELINE_DAYS, METRICS, twinSeries, type MetricId } from '../../engine'
import { useI18n } from '../../i18n'
import { useMission } from '../../state/mission'
import { AXIS_TICK, InfoButton, PageHeader, Pill, SimBadge, SimulatedBadge } from './ui'

const CHART_METRICS: MetricId[] = ['pvtMs', 'sleepH', 'hrv', 'restHr', 'sysBp', 'spo2', 'tempC', 'glucose', 'lymph', 'mskIndex']

export function TwinContent() {
  const { t } = useI18n()
  const { current, mission } = useMission()
  const firstDeviant = CHART_METRICS.find((id) => current.metrics[id].twinAlarmDay !== null) ?? 'pvtMs'
  const [picked, setPicked] = useState<MetricId | null>(null)
  const metric = picked ?? firstDeviant
  const def = METRICS[metric]
  const state = current.metrics[metric]
  const crew = mission.crew.find((c) => c.id === current.crewId)!

  const data = useMemo(
    () =>
      twinSeries(crew.days, metric).map((p) => ({
        ...p,
        expected: Number(p.expected.toFixed(2)),
        band: [Number(p.bandLo.toFixed(2)), Number(p.bandHi.toFixed(2))] as [number, number],
        label: t('twin.day', { day: p.day }),
      })),
    [crew.days, metric, t],
  )

  const values = data.flatMap((p) => [p.observed, p.band[0], p.band[1]])
  const earthEdge = def.bad === 'high' ? def.earth[1] : def.earth[0]
  const lo = Math.min(...values, earthEdge)
  const hi = Math.max(...values, earthEdge)
  const pad = (hi - lo) * 0.08 || 1
  // Round the axis to "nice" steps for the metric's precision.
  const step = def.digits === 0 ? 10 : def.digits === 1 ? 0.5 : 0.2
  const domain: [number, number] = [
    Number((Math.floor((lo - pad) / step) * step).toFixed(2)),
    Number((Math.ceil((hi + pad) / step) * step).toFixed(2)),
  ]
  const { earthAlarmDay: earth, twinAlarmDay: twin } = state
  const unit = def.unit

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('twin.title')}
        subtitle={t('twin.subtitle', { name: current.name })}
        right={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-label={t('twin.metric')}
                className="h-10 shrink-0 gap-1.5 rounded-lg px-3.5 text-sm font-normal tracking-tight shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
              >
                <CalendarIcon className="size-4" />
                <span>{t(`metric.${metric}`)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bionis-dashboard min-w-48">
              <DropdownMenuRadioGroup value={metric} onValueChange={(v) => setPicked(v as MetricId)}>
                {CHART_METRICS.map((id) => (
                  <DropdownMenuRadioItem
                    key={id}
                    value={id}
                    className="font-normal text-muted-foreground data-[state=checked]:font-medium data-[state=checked]:text-foreground"
                  >
                    {t(`metric.${id}`)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <SimBadge />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <p className="text-sm font-medium tracking-tight">{t('twin.earthRule')}</p>
          <div className="flex flex-col gap-2">
            <p className="leading-none">
              <span className="text-2.5xl font-medium tabular-nums">{earth ?? '—'}</span>{' '}
              <span className="font-normal">{earth !== null ? t('twin.dayUnit') : ''}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {earth !== null ? t('twin.earthRule.hit', { lo: def.earth[0], hi: def.earth[1], unit }) : t('twin.earthRule.none', { day: current.day })}
            </p>
          </div>
        </article>
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <p className="text-sm font-medium tracking-tight">{t('twin.twinRule')}</p>
          <div className="flex flex-col gap-2">
            <p className="leading-none">
              <span className="text-2.5xl font-medium tabular-nums">{twin ?? '—'}</span>{' '}
              <span className="font-normal">{twin !== null ? t('twin.dayUnit') : ''}</span>
            </p>
            <p className="text-xs text-muted-foreground">{twin !== null ? t('twin.twinRule.hit') : t('twin.twinRule.none')}</p>
          </div>
        </article>
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <p className="text-sm font-medium tracking-tight">{t('twin.lead')}</p>
          <div className="flex flex-col gap-2">
            <p className="leading-none">
              <span className="text-2.5xl font-medium tabular-nums">
                {twin !== null ? (earth !== null ? earth - twin : `${current.day - twin}+`) : '—'}
              </span>{' '}
              <span className="font-normal">{twin !== null ? t('twin.daysEarlier') : ''}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {twin === null
                ? t('twin.lead.none')
                : earth !== null
                  ? t('twin.compare.both', { earth, twin, metric: t(`metric.${metric}`) })
                  : t('twin.compare.twinOnly', { twin, metric: t(`metric.${metric}`) })}
            </p>
          </div>
        </article>
      </section>

      <article className="flex min-h-110 flex-col gap-5 rounded-2xl border bg-background p-4 md:p-6" data-tour="twin">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--insight-prediction) text-white">
              <TrendsIcon className="size-4.5" />
            </span>
            <h3 className="text-lg font-medium tracking-tight">
              {t(`metric.${metric}`)} ({unit})
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <InfoButton id={metric} name={t(`metric.${metric}`)} />
          <SimulatedBadge />
          <Pill level={state.deviant ? 'alert' : 'nominal'}>
            {state.deviant ? t('twin.status.off') : t('twin.status.on')}
          </Pill>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-xs bg-(--prediction-danger)/40" />
            <span>{t('twin.legend.earth')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-xs bg-(--chart-recovery)/50" />
            <span>{t('twin.legend.band')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-(--chart-recovery)" />
            <span>{t('twin.legend.expected')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-(--chart-steps)" />
            <span>{t('twin.legend.observed')}</span>
          </div>
        </div>

        <div className="h-80 w-full min-w-0 pt-2" role="img" aria-label={t('twin.chartAria', { metric: t(`metric.${metric}`), name: current.name })}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
              <XAxis dataKey="day" type="number" domain={[1, current.day]} tickCount={9} axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis domain={domain} allowDataOverflow axisLine={false} tickLine={false} tick={AXIS_TICK} width={44} />
              {/* Layer 1: outside the Earth reference range */}
              {def.bad === 'high' ? (
                <ReferenceArea y1={def.earth[1]} y2={domain[1]} fill="var(--prediction-danger)" fillOpacity={0.08} ifOverflow="hidden" />
              ) : (
                <ReferenceArea y1={domain[0]} y2={def.earth[0]} fill="var(--prediction-danger)" fillOpacity={0.08} ifOverflow="hidden" />
              )}
              <ReferenceLine y={earthEdge} stroke="var(--prediction-danger)" strokeDasharray="2 4" ifOverflow="hidden"
                label={{ value: t('twin.earthLimit'), position: 'insideTopRight', fill: 'var(--prediction-danger)', fontSize: 10 }} />
              {/* Layer 2: personal baseline window */}
              <ReferenceLine x={BASELINE_DAYS} stroke="var(--chart-axis)" strokeDasharray="2 4"
                label={{ value: t('twin.baselineEnd'), position: 'insideTopLeft', fill: 'var(--muted-foreground)', fontSize: 10 }} />
              {twin !== null ? (
                <ReferenceLine x={twin} stroke="var(--chart-period)" strokeWidth={1.5}
                  label={{ value: `AstroTwin · ${twin}`, position: 'top', fill: 'var(--chart-period)', fontSize: 10 }} />
              ) : null}
              {earth !== null ? (
                <ReferenceLine x={earth} stroke="var(--prediction-danger)" strokeWidth={1.5}
                  label={{ value: `${t('twin.earthShort')} · ${earth}`, position: 'top', fill: 'var(--prediction-danger)', fontSize: 10 }} />
              ) : null}
              <Tooltip
                cursor={{ stroke: 'var(--foreground)', strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.35 }}
                content={
                  <ChartTooltip
                    icon={CalendarIcon}
                    items={[
                      { label: t('twin.legend.observed'), dataKey: 'observed', formatValue: (v) => `${v} ${unit}`, color: 'var(--chart-steps)' },
                      { label: t('twin.legend.expected'), dataKey: 'expected', formatValue: (v) => `${Number(v).toFixed(def.digits)} ${unit}`, color: 'var(--chart-recovery)' },
                    ]}
                  />
                }
              />
              {/* Layer 3: expected space trajectory ± personal tolerance */}
              <Area type="monotone" dataKey="band" stroke="none" fill="var(--chart-recovery)" fillOpacity={0.16} isAnimationActive={false} activeDot={false} />
              <Line type="monotone" dataKey="expected" stroke="var(--chart-recovery)" strokeWidth={1.5} strokeDasharray="8 6" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="observed" stroke="var(--chart-steps)" strokeWidth={2.5} dot={false}
                activeDot={{ r: 4, fill: 'var(--chart-steps)', stroke: 'var(--background)', strokeWidth: 2 }}
                // No draw-in animation: the key evidence must be visible even if the tab loads in the background.
                isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('twin.explain')}</p>
      </article>
    </div>
  )
}
