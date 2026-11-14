// Clickable body figure: each area takes the colour of its current status and
// opens the indicators and alerts that belong to it. Fully keyboard-operable
// (Tab to an area, Enter/Space to open) and mirrored by a labelled button list.
import { useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CO2_ELEVATED_MMHG, maxLevel, METRICS, type Assessment, type Finding, type Level, type MetricId } from '../../engine'
import { useI18n } from '../../i18n'
import { findingText, LEVEL_NAMES } from '../../i18n/findings'
import type { InfoId } from '../../i18n/info'
import { useDashboardNavigation } from '../bionis/navigation'
import { InfoButton, levelText, Pill, SimulatedBadge } from './ui'

export type RegionId = 'brain' | 'eyes' | 'heart' | 'lungs' | 'msk' | 'body'
export const REGION_IDS: RegionId[] = ['brain', 'eyes', 'heart', 'lungs', 'msk', 'body']

const REGION_METRICS: Record<RegionId, MetricId[]> = {
  brain: ['pvtMs', 'sleepH'],
  eyes: [],
  heart: ['restHr', 'hrv', 'sysBp'],
  lungs: ['spo2'],
  msk: ['mskIndex', 'bodyMass'],
  body: ['tempC', 'glucose', 'lymph'],
}
/** Non-metric findings (events and compound rules) shown under each area. */
const REGION_FINDINGS: Record<RegionId, string[]> = {
  brain: ['rule.judgment', 'rule.conflict'],
  eyes: ['event.vision', 'rule.sans'],
  heart: [],
  lungs: ['event.co2'],
  msk: [],
  body: ['rule.sepEva', 'event.sep', 'event.dose', 'rule.virus', 'event.rash'],
}

export function regionFindings(a: Assessment, region: RegionId): Finding[] {
  const ids = new Set([...REGION_METRICS[region].map((m) => `metric.${m}`), ...REGION_FINDINGS[region]])
  return a.findings.filter((f) => ids.has(f.id))
}
export function regionLevel(a: Assessment, region: RegionId): Level {
  return regionFindings(a, region).reduce<Level>((l, f) => maxLevel(l, f.level), 'nominal')
}

// Green / yellow / red, using the design's own status tokens.
const FILL: Record<Level, string> = {
  nominal: 'var(--vital-good)',
  watch: 'var(--prediction-warn)',
  alert: 'var(--prediction-warn)',
  critical: 'var(--prediction-danger)',
}
const DOT: Record<Level, string> = {
  nominal: 'bg-(--vital-good)',
  watch: 'bg-(--prediction-warn)',
  alert: 'bg-(--prediction-warn)',
  critical: 'bg-(--prediction-danger)',
}

interface Row {
  info: InfoId
  label: string
  value: string
  note?: string
  level: Level
}

export function BodyMap({ assessment: a }: { assessment: Assessment }) {
  const { t, lang } = useI18n()
  const { navigate } = useDashboardNavigation()
  const levels = Object.fromEntries(REGION_IDS.map((r) => [r, regionLevel(a, r)])) as Record<RegionId, Level>
  // Open on the worst area so the problem is visible without a click.
  const worst = [...REGION_IDS].sort(
    (x, y) => ['nominal', 'watch', 'alert', 'critical'].indexOf(levels[y]) - ['nominal', 'watch', 'alert', 'critical'].indexOf(levels[x]),
  )[0]
  const [picked, setPicked] = useState<RegionId | null>(null)
  const region = picked ?? worst
  const findings = regionFindings(a, region)

  const metricRow = (id: MetricId): Row => {
    const m = a.metrics[id]
    return {
      info: id,
      label: t(`metric.${id}`),
      value: `${m.value} ${METRICS[id].unit}`,
      note: t('value.expected', { value: `${m.expected.toFixed(METRICS[id].digits)} ${METRICS[id].unit}` }),
      level: m.outsideEarth || m.zBad >= 3 ? 'alert' : m.deviant ? 'watch' : 'nominal',
    }
  }
  const rows: Row[] = REGION_METRICS[region].map(metricRow)
  if (region === 'brain')
    rows.push({ info: 'mood', label: t('metric.mood'), value: `${a.record.mood}/5 · ${a.record.stress}/5`, level: a.record.stress >= 4 ? 'watch' : 'nominal' })
  if (region === 'eyes')
    rows.push({
      info: 'vision',
      label: t('metric.vision'),
      value: a.record.visionChange ? t('value.visionChanged') : t('value.visionOk'),
      level: a.record.visionChange ? 'watch' : 'nominal',
    })
  if (region === 'lungs')
    rows.push({ info: 'co2', label: t('metric.co2'), value: `${a.co2Avg3.toFixed(1)} mmHg`, level: a.co2Avg3 >= CO2_ELEVATED_MMHG ? 'watch' : 'nominal' })
  if (region === 'msk')
    rows.push({ info: 'exercise', label: t('metric.exercise'), value: `${a.record.exerciseMin} min`, level: 'nominal' })
  if (region === 'body')
    rows.unshift({
      info: 'dose',
      label: t('metric.dose'),
      value: `${a.cumulativeDoseMsv.toFixed(1)} mSv`,
      note: `${a.careerLimitPct.toFixed(1)}% / 600 mSv`,
      level: a.careerLimitPct >= 50 ? 'watch' : 'nominal',
    })

  const areaProps = (id: RegionId) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-pressed': region === id,
    'aria-label': t('body.aria', { region: `${t(`body.${id}`)} — ${t(`body.${id}.sub`)}`, level: LEVEL_NAMES[lang][levels[id]] }),
    onClick: () => setPicked(id),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setPicked(id)
      }
    },
    className: cn('body-region cursor-pointer outline-none', region === id && 'body-region-active'),
    style: { color: FILL[levels[id]] },
  })
  const shape = { fill: 'currentColor', fillOpacity: 0.3, stroke: 'currentColor', strokeWidth: 2 }

  return (
    <article className="flex flex-col gap-5 rounded-2xl border bg-background p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-medium">{t('body.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('body.sub')}</p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-4">
          <svg viewBox="0 0 220 440" className="h-80 w-auto" role="group" aria-label={t('body.title')}>
            {/* Whole body: torso and head outline */}
            <g {...areaProps('body')}>
              <rect x="66" y="92" width="88" height="152" rx="28" {...shape} />
              <rect x="98" y="76" width="24" height="24" rx="8" {...shape} />
              <path d="M 76 48 A 34 34 0 0 0 144 48 Z" {...shape} />
            </g>
            {/* Bones & muscles: arms and legs */}
            <g {...areaProps('msk')}>
              <rect x="32" y="98" width="26" height="150" rx="13" {...shape} />
              <rect x="162" y="98" width="26" height="150" rx="13" {...shape} />
              <rect x="72" y="236" width="34" height="184" rx="17" {...shape} />
              <rect x="114" y="236" width="34" height="184" rx="17" {...shape} />
            </g>
            {/* Brain: upper half of the head */}
            <g {...areaProps('brain')}>
              <path d="M 76 48 A 34 34 0 0 1 144 48 Z" {...shape} fillOpacity={0.45} />
            </g>
            {/* Eyes */}
            <g {...areaProps('eyes')}>
              <ellipse cx="97" cy="58" rx="8" ry="5" {...shape} fillOpacity={0.7} />
              <ellipse cx="123" cy="58" rx="8" ry="5" {...shape} fillOpacity={0.7} />
            </g>
            {/* Lungs */}
            <g {...areaProps('lungs')}>
              <ellipse cx="89" cy="146" rx="15" ry="30" {...shape} fillOpacity={0.45} />
              <ellipse cx="131" cy="146" rx="15" ry="30" {...shape} fillOpacity={0.45} />
            </g>
            {/* Heart */}
            <g {...areaProps('heart')}>
              <path
                d="M 112 166 C 100 156 96 146 103 141 C 108 138 112 142 112 146 C 112 142 116 138 121 141 C 128 146 124 156 112 166 Z"
                {...shape}
                fillOpacity={0.8}
              />
            </g>
          </svg>

          <div className="flex flex-wrap justify-center gap-2">
            {REGION_IDS.map((id) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={region === id ? 'default' : 'outline'}
                aria-pressed={region === id}
                onClick={() => setPicked(id)}
              >
                <span aria-hidden className={cn('size-2 rounded-full', DOT[levels[id]])} />
                {t(`body.${id}`)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{t(`body.${region}`)}</p>
              <p className="text-sm text-muted-foreground">{t(`body.${region}.sub`)}</p>
            </div>
            <Pill level={levels[region]} className="px-2.5 text-xs">
              {LEVEL_NAMES[lang][levels[region]]}
            </Pill>
          </div>

          <div className="flex flex-col rounded-xl bg-muted/60 p-3">
            {rows.map((row) => (
              <div key={row.info} className="flex items-center justify-between gap-3 py-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-sm text-muted-foreground">{row.label}</p>
                  <InfoButton id={row.info} name={row.label} />
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn('text-sm font-semibold tabular-nums', row.level === 'nominal' ? 'text-(--vital-good)' : levelText[row.level])}>
                    {row.value}
                  </p>
                  {row.note ? <p className="text-xs text-muted-foreground">{row.note}</p> : null}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t('body.alerts')}</p>
            {findings.length === 0 ? (
              <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{t('body.noAlerts')}</p>
            ) : (
              findings.map((f) => {
                const text = findingText(f, lang)
                return (
                  <div key={f.id} className="flex flex-col gap-1 rounded-xl bg-muted px-3 py-2">
                    <p className={cn('text-sm font-medium', levelText[f.level])}>{text.title}</p>
                    <p className="text-xs text-muted-foreground">{text.what}</p>
                  </div>
                )
              })
            )}
            {findings.length > 0 ? (
              <Button type="button" variant="outline" className="w-fit rounded-xl" onClick={() => navigate('/surgeon')}>
                {t('compound.open')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
