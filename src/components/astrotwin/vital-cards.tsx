// Core vital signs as cards: heart rate, blood pressure, SpO₂, temperature,
// sleep and activity. Each is SIMULATED, compared with the person's own
// baseline plus fixed prototype limits (engine: metricState().level).
import type { ComponentType, SVGProps } from 'react'
import { ActivityIcon, DropletIcon, HeartPulseIcon, MoonIcon, ThermometerIcon, WindIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { maxLevel, METRICS, type Assessment, type Level, type MetricId } from '../../engine'
import { useI18n } from '../../i18n'
import { LEVEL_NAMES } from '../../i18n/findings'
import type { InfoId } from '../../i18n/info'
import { InfoButton, Pill, SimulatedBadge } from './ui'

interface VitalCard {
  key: string
  info: InfoId
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  color: string
  value: string
  unit: string
  expected: string
  level: Level
}

const fmt = (id: MetricId, v: number) => v.toFixed(METRICS[id].digits)

export function VitalSigns({ assessment: a }: { assessment: Assessment }) {
  const { t, lang } = useI18n()
  const m = a.metrics
  const one = (id: MetricId, icon: VitalCard['icon'], color: string): VitalCard => ({
    key: id,
    info: id,
    label: t(`metric.${id}`),
    icon,
    color,
    value: fmt(id, m[id].value),
    unit: METRICS[id].unit,
    expected: `${fmt(id, m[id].expected)} ${METRICS[id].unit}`,
    level: m[id].level,
  })
  const cards: VitalCard[] = [
    { ...one('restHr', HeartPulseIcon, 'var(--metric-heart)'), label: t('vitals.hr') },
    {
      key: 'bp',
      info: 'sysBp',
      label: t('vitals.bp'),
      icon: DropletIcon,
      color: 'var(--insight-vitals)',
      value: `${m.sysBp.value}/${m.diaBp.value}`,
      unit: 'mmHg',
      expected: `${fmt('sysBp', m.sysBp.expected)}/${fmt('diaBp', m.diaBp.expected)} mmHg`,
      level: maxLevel(m.sysBp.level, m.diaBp.level),
    },
    one('spo2', WindIcon, 'var(--metric-steps)'),
    { ...one('tempC', ThermometerIcon, 'var(--prediction-warn)'), label: t('vitals.temp') },
    { ...one('sleepH', MoonIcon, 'var(--metric-sleep)'), label: t('vitals.sleep') },
    { ...one('exerciseMin', ActivityIcon, 'var(--metric-recovery)'), label: t('vitals.activity') },
  ]

  return (
    <section className="flex flex-col gap-3.5" data-tour="vitals">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{t('vitals.cardsTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('vitals.cardsSub', { name: a.name, day: a.day })}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <article key={c.key} className="flex min-h-37.5 min-w-0 flex-col justify-between gap-3 rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: c.color }}>
                  <c.icon className="size-3.5" />
                </span>
                <p className="truncate text-sm font-medium tracking-tight">{c.label}</p>
                <InfoButton id={c.info} name={c.label} />
              </div>
              <SimulatedBadge className="px-2 py-1" />
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <p className="leading-none">
                  <span className="text-2.5xl font-medium tabular-nums">{c.value}</span>{' '}
                  <span className="font-normal">{c.unit}</span>
                </p>
                <p className="text-xs text-muted-foreground">{t('value.expected', { value: c.expected })}</p>
              </div>
              <Pill level={c.level} className={cn('px-2.5 text-xs')}>
                {LEVEL_NAMES[lang][c.level]}
              </Pill>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
