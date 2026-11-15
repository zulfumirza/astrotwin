// Clickable body figure: each area takes the colour of its current status and
// opens the indicators and alerts that belong to it. Fully keyboard-operable
// (Tab to an area, Enter/Space to open) and mirrored by a labelled button list.
import { useState } from 'react'
import Body, { type ExtendedBodyPart, type Slug } from 'react-muscle-highlighter'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CO2_ELEVATED_MMHG, maxLevel, METRICS, type Assessment, type Finding, type Level, type MetricId } from '../../engine'
import { useI18n } from '../../i18n'
import { findingText, LEVEL_NAMES } from '../../i18n/findings'
import type { InfoId } from '../../i18n/info'
import { useDashboardNavigation } from '../bionis/navigation'
import { useTheme } from '../bionis/theme-provider'
import { InfoButton, levelText, Pill, SimulatedBadge } from './ui'

export type RegionId = 'brain' | 'eyes' | 'heart' | 'lungs' | 'msk' | 'body'
export const REGION_IDS: RegionId[] = ['brain', 'eyes', 'heart', 'lungs', 'msk', 'body']

const REGION_METRICS: Record<RegionId, MetricId[]> = {
  brain: ['pvtMs', 'sleepH'],
  eyes: [],
  heart: ['restHr', 'hrv', 'sysBp', 'diaBp'],
  lungs: ['spo2'],
  msk: ['mskIndex', 'bodyMass', 'exerciseMin'],
  body: ['tempC', 'glucose', 'lymph'],
}
/** Non-metric findings (events and compound rules) shown under each area. */
const REGION_FINDINGS: Record<RegionId, string[]> = {
  brain: ['rule.judgment', 'rule.conflict'],
  eyes: ['event.vision', 'event.visionWatch', 'event.visionAlert', 'event.visionUrgent', 'rule.sans'],
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

// Anatomical figure: react-muscle-highlighter (MIT, SVG, no dependencies; works offline).
// Eyes and heart have no muscle slug, so they are drawn as a small overlay on the front view.
const REGION_SLUGS: Record<RegionId, Slug[]> = {
  brain: ['head', 'hair'],
  eyes: [],
  heart: [],
  lungs: ['chest', 'upper-back'],
  msk: ['deltoids', 'biceps', 'triceps', 'forearm', 'abs', 'obliques', 'trapezius', 'lower-back', 'gluteal', 'adductors', 'quadriceps', 'hamstring', 'calves', 'tibialis'],
  body: ['neck', 'hands', 'feet', 'knees', 'ankles'],
}
const SLUG_REGION = new Map<Slug, RegionId>(
  REGION_IDS.flatMap((r) => REGION_SLUGS[r].map((slug) => [slug, r] as [Slug, RegionId])),
)
/** Fictional crew: which body model to draw. */
const FEMALE_CREW = new Set(['cdr', 'ms2'])

// Status tints. SVG fill attributes cannot use CSS variables, so the two themes are explicit.
const TINT: Record<'light' | 'dark', Record<Level, string>> = {
  light: { nominal: '#86efac', watch: '#fcd34d', alert: '#fbbf24', critical: '#f87171' },
  dark: { nominal: '#15803d', watch: '#b45309', alert: '#c2410c', critical: '#b91c1c' },
}
const SELECTED_STROKE = { light: '#0f172a', dark: '#f8fafc' } as const

/** Overlay positions for eyes and heart, in each front model's own viewBox units. */
const OVERLAY: Record<'male' | 'female', { viewBox: string; eyes: [number, number][]; eyeR: [number, number]; heart: [number, number]; heartScale: number }> = {
  // Measured from the rendered head and chest paths (getBBox) of react-muscle-highlighter 1.2.0.
  male: { viewBox: '0 0 724 1448', eyes: [[343, 186], [385, 186]], eyeR: [13, 8], heart: [396, 372], heartScale: 2.2 },
  female: { viewBox: '-50 -40 734 1538', eyes: [[299, 166], [341, 166]], eyeR: [13, 8], heart: [352, 370], heartScale: 2.2 },
}

function AnatomyFigure({
  levels,
  region,
  onPick,
  gender,
}: {
  levels: Record<RegionId, Level>
  region: RegionId
  onPick: (r: RegionId) => void
  gender: 'male' | 'female'
}) {
  const { resolvedTheme } = useTheme()
  const tint = TINT[resolvedTheme]
  const data: ExtendedBodyPart[] = REGION_IDS.flatMap((r) =>
    REGION_SLUGS[r].map((slug) => ({
      slug,
      color: tint[levels[r]],
      styles: r === region ? { stroke: SELECTED_STROKE[resolvedTheme], strokeWidth: 3 } : undefined,
    })),
  )
  const press = (part: ExtendedBodyPart) => {
    const r = part.slug ? SLUG_REGION.get(part.slug) : undefined
    if (r) onPick(r)
  }
  const o = OVERLAY[gender]
  const overlayShape = (r: RegionId) => ({
    fill: tint[levels[r]],
    stroke: region === r ? SELECTED_STROKE[resolvedTheme] : '#0f172a',
    strokeWidth: region === r ? 4 : 2,
    style: { cursor: 'pointer', pointerEvents: 'auto' as const },
    onClick: () => onPick(r),
  })
  const common = {
    data,
    gender,
    scale: 0.8,
    border: 'none' as const,
    defaultFill: resolvedTheme === 'dark' ? '#334155' : '#cbd5e1',
    onBodyPartPress: press,
  }
  // Mouse/touch shortcut only: keyboard and screen-reader users use the labelled buttons below.
  return (
    <div aria-hidden="true" className="anatomy-figure flex items-start justify-center gap-2">
      <div className="relative">
        <Body {...common} side="front" />
        <svg viewBox={o.viewBox} className="pointer-events-none absolute inset-0 h-full w-full">
          {o.eyes.map(([cx, cy]) => (
            <ellipse key={cx} cx={cx} cy={cy} rx={o.eyeR[0]} ry={o.eyeR[1]} {...overlayShape('eyes')} />
          ))}
          <path
            transform={`translate(${o.heart[0]} ${o.heart[1]}) scale(${o.heartScale})`}
            d="M 0 14 C -10 6 -14 -2 -8 -7 C -4 -10 0 -7 0 -3 C 0 -7 4 -10 8 -7 C 14 -2 10 6 0 14 Z"
            {...overlayShape('heart')}
          />
        </svg>
      </div>
      <Body {...common} side="back" />
    </div>
  )
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
      level: m.level,
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
  if (region === 'body')
    rows.unshift({
      info: 'dose',
      label: t('metric.dose'),
      value: `${a.cumulativeDoseMsv.toFixed(1)} mSv`,
      note: `${a.careerLimitPct.toFixed(1)}% / 600 mSv`,
      level: a.careerLimitPct >= 50 ? 'watch' : 'nominal',
    })


  return (
    <article className="flex flex-col gap-5 rounded-2xl border bg-background p-4 md:p-5" data-tour="bodymap">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-medium">{t('body.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('body.sub')}</p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-4">
          <AnatomyFigure levels={levels} region={region} onPick={setPicked} gender={FEMALE_CREW.has(a.crewId) ? 'female' : 'male'} />

          <div className="flex flex-wrap justify-center gap-2">
            {REGION_IDS.map((id) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={region === id ? 'default' : 'outline'}
                aria-pressed={region === id}
                aria-label={t('body.aria', { region: `${t(`body.${id}`)} — ${t(`body.${id}.sub`)}`, level: LEVEL_NAMES[lang][levels[id]] })}
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
