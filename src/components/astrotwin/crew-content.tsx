import {
  AlertDiamondIcon,
  AlertTriangleIcon,
  BlingFilledIcon,
  CalendarIcon,
  CheckCircleRegularIcon,
  HeartbeatFilledIcon,
  Sparkles3FilledIcon,
} from '../bionis/icons'
import { ScoreDonut } from '../bionis/shared'
import { useDashboardNavigation } from '../bionis/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  CO2_ELEVATED_MMHG,
  formatDelay,
  METRICS,
  type Assessment,
  type HazardId,
  type Level,
  type ScenarioId,
} from '../../engine'
import { useI18n } from '../../i18n'
import { findingText, HAZARD_NAMES, LEVEL_NAMES, TIER_NAMES } from '../../i18n/findings'
import { useMission } from '../../state/mission'
import {
  hazardColor,
  hazardIcon,
  levelColor,
  levelText,
  Pill,
  SimBadge,
  SourceBadge,
  tierLevel,
  usePrefersReducedMotion,
} from './ui'

export const SCENARIOS: ScenarioId[] = ['nominal', 'hidden', 'storm', 'immune']

export function ScenarioSelect() {
  const { t } = useI18n()
  const { scenario, setScenario } = useMission()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={t('scenario.label')}
          className="h-10 shrink-0 gap-1.5 rounded-lg px-3.5 text-sm font-normal tracking-tight shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
        >
          <CalendarIcon className="size-4" />
          <span>{t(`scenario.${scenario}`)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bionis-dashboard min-w-56">
        <DropdownMenuRadioGroup value={scenario} onValueChange={(v) => setScenario(v as ScenarioId)}>
          {SCENARIOS.map((s) => (
            <DropdownMenuRadioItem
              key={s}
              value={s}
              className="font-normal text-muted-foreground data-[state=checked]:font-medium data-[state=checked]:text-foreground"
            >
              {t(`scenario.${s}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const levelIcon = {
  nominal: CheckCircleRegularIcon,
  watch: AlertTriangleIcon,
  alert: AlertTriangleIcon,
  critical: AlertDiamondIcon,
} as const

function InsightBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-xl bg-background px-2.5 py-2 text-xs font-medium tracking-tight text-(--chart-period)">
      {children}
    </span>
  )
}

function hazardFact(a: Assessment, id: HazardId, t: ReturnType<typeof useI18n>['t']): string {
  switch (id) {
    case 'radiation':
      return t('hazard.fact.radiation', { dose: a.cumulativeDoseMsv.toFixed(0), pct: a.careerLimitPct.toFixed(0) })
    case 'isolation':
      return t('hazard.fact.isolation', { sleep: a.record.sleepH, debt: a.sleepDebt7.toFixed(1) })
    case 'distance':
      return t('hazard.fact.distance', { delay: formatDelay(a.delaySec) })
    case 'gravity':
      return t('hazard.fact.gravity', { min: a.record.exerciseMin, hr: a.record.restHr })
    case 'environment':
      return t('hazard.fact.environment', { co2: a.co2Avg3.toFixed(1), limit: CO2_ELEVATED_MMHG.toFixed(1) })
  }
}

export function CrewContent() {
  const { t, lang } = useI18n()
  const { navigate } = useDashboardNavigation()
  const reducedMotion = usePrefersReducedMotion()
  const { assessments, current, setSelectedId, scenario, mission, profile, marsRange, liveSep } = useMission()

  const top = current.findings[0]
  const topText = top ? findingText(top, lang) : null
  const compound = current.findings.filter((f) => f.kind === 'compound')
  const shownFindings = (compound.length ? compound : current.findings).slice(0, 3)
  const actions = [...new Set(current.findings.map((f) => findingText(f, lang).action))].slice(0, 4)
  const lead = (['pvtMs', 'sleepH', 'hrv', 'lymph', 'restHr'] as const)
    .map((id) => current.metrics[id])
    .find((m) => m.twinAlarmDay !== null)

  const vitals: Array<{ id: string; label: string; value: string; level: Level }> = [
    ...(['restHr', 'hrv', 'sleepH', 'pvtMs', 'lymph'] as const).map((id) => {
      const m = current.metrics[id]
      return {
        id,
        label: t(`metric.${id}`),
        value: `${m.value} ${METRICS[id].unit}`,
        level: (m.outsideEarth || m.zBad >= 3 ? 'critical' : m.deviant ? 'watch' : 'nominal') as Level,
      }
    }),
    {
      id: 'co2',
      label: t('metric.co2'),
      value: `${current.co2Avg3.toFixed(1)} mmHg`,
      level: current.co2Avg3 >= CO2_ELEVATED_MMHG ? 'watch' : 'nominal',
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="min-w-0 truncate text-xl font-medium md:text-2xl">
            {t('crew.title', { day: mission.today, profile: t(`profile.${profile}`) })}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <SimBadge />
            {profile === 'mars' ? <SourceBadge source={marsRange.source} at={marsRange.fetchedAt} /> : null}
            {liveSep ? <Pill level="critical" className="text-xs">{t('rad.liveSep')}</Pill> : null}
          </div>
        </div>
        <ScenarioSelect />
      </div>

      <section className="flex items-center gap-6">
        <div className="flex min-h-28.5 flex-col justify-between gap-4">
          <h2 className="text-lg font-medium">
            {current.name}{' '}
            <span className="font-normal text-muted-foreground">
              · {mission.crew.find((c) => c.id === current.crewId)?.role[lang]}
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            <Pill level={tierLevel[current.tier]}>
              {t('tier.label')}: {TIER_NAMES[lang][current.tier]}
            </Pill>
            <p className="max-w-xl text-sm leading-[1.4] text-muted-foreground">
              {topText ? (
                <>
                  <span className="font-medium text-foreground">{topText.title}. </span>
                  {topText.what}
                </>
              ) : (
                t('crew.allNominal')
              )}
            </p>
            {lead ? (
              <p className="max-w-xl text-sm leading-[1.4] text-muted-foreground">
                {lead.earthAlarmDay !== null
                  ? t('twin.compare.both', { earth: lead.earthAlarmDay, twin: lead.twinAlarmDay!, metric: t(`metric.${lead.id}`) })
                  : t('twin.compare.twinOnly', { twin: lead.twinAlarmDay!, metric: t(`metric.${lead.id}`) })}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/twin')}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  {t('twin.open')}
                </button>
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <ScoreDonut
            value={current.score}
            label={t('score.label')}
            color={levelColor[tierLevel[current.tier]]}
            animate={!reducedMotion}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{t('crew.section')}</h2>
          <p className="text-sm text-muted-foreground">{t('crew.sectionSub')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {assessments.map((a) => {
            const member = mission.crew.find((c) => c.id === a.crewId)!
            const active = a.crewId === current.crewId
            return (
              <button
                key={a.crewId}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedId(a.crewId)}
                className={cn(
                  'flex min-h-37.5 min-w-0 flex-col justify-between rounded-2xl border p-4 text-left transition-colors hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                  active && 'border-foreground/40 bg-muted/40',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium tracking-tight">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.role[lang]}</p>
                  </div>
                  <Pill level={tierLevel[a.tier]} className="px-2.5 text-xs">
                    {TIER_NAMES[lang][a.tier]}
                  </Pill>
                </div>
                <div className="flex flex-col gap-3">
                  <p className="leading-none">
                    <span className="text-2.5xl font-medium tabular-nums">{a.score}</span>{' '}
                    <span className="font-normal">/ 100</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.findings[0] ? findingText(a.findings[0], lang).title : t('crew.onTrajectory')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{t('hazards.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('hazards.sub')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {current.hazards.map((h) => {
            const Icon = hazardIcon[h.id]
            const first = current.findings.find((f) => f.hazard === h.id)
            return (
              <article key={h.id} className="flex min-h-44 min-w-0 flex-col justify-between gap-3 rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-white"
                      style={{ backgroundColor: hazardColor[h.id] }}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <p className="text-sm font-medium leading-tight tracking-tight">{HAZARD_NAMES[lang][h.id]}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="leading-none">
                    <span className="text-2.5xl font-medium tabular-nums">{h.score}</span>{' '}
                    <span className={cn('text-sm font-medium', levelText[h.level])}>{LEVEL_NAMES[lang][h.level]}</span>
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {first ? findingText(first, lang).title : hazardFact(current, h.id, t)}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="flex min-h-85.5 flex-col gap-6 rounded-2xl border bg-[linear-gradient(180deg,rgb(99_102_241/0.08)_0%,transparent_42%)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--insight-prediction) text-white">
                <Sparkles3FilledIcon className="size-4" />
              </span>
              <h3 className="font-medium">{t('compound.title')}</h3>
            </div>
            <InsightBadge>{t('compound.badge')}</InsightBadge>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            {shownFindings.length === 0 ? (
              <div className="flex flex-1 items-center gap-3 rounded-xl bg-muted px-3 py-2">
                <CheckCircleRegularIcon className="size-5 shrink-0 text-(--vital-good)" />
                <p className="text-sm font-medium">{t('compound.none')}</p>
              </div>
            ) : (
              shownFindings.map((f) => {
                const Icon = levelIcon[f.level]
                const text = findingText(f, lang)
                return (
                  <div key={f.id} className="flex flex-1 items-center gap-3 rounded-xl bg-muted px-3 py-2">
                    <Icon className={cn('size-5 shrink-0', levelText[f.level])} />
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <p className="text-sm font-medium">{text.title}</p>
                      <p className="text-xs text-muted-foreground">{text.what}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => navigate('/surgeon')}>
            {t('compound.open')}
          </Button>
        </article>

        <article className="flex min-h-85.5 flex-col gap-6 rounded-2xl border bg-[linear-gradient(180deg,rgb(247_46_46/0.08)_0%,transparent_42%)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--insight-vitals) text-white">
                <HeartbeatFilledIcon className="size-4" />
              </span>
              <h3 className="font-medium">{t('vitals.title')}</h3>
            </div>
            <InsightBadge>{t('vitals.badge', { day: current.day })}</InsightBadge>
          </div>
          <div className="flex flex-1 flex-col justify-between rounded-xl bg-background p-3">
            {vitals.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 py-1.5">
                <p className="text-muted-foreground">{v.label}</p>
                <p className={cn('shrink-0 font-semibold', v.level === 'nominal' ? 'text-(--vital-good)' : levelText[v.level])}>
                  {v.value}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="flex min-h-85.5 flex-col gap-6 rounded-2xl border bg-[linear-gradient(180deg,rgb(20_184_166/0.08)_0%,transparent_42%)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--insight-actions) text-white">
              <BlingFilledIcon className="size-4" />
            </span>
            <h3 className="font-medium">{t('actions.title')}</h3>
          </div>
          <div className="flex flex-1 flex-col justify-between gap-2">
            {actions.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl bg-muted px-3 py-2">
                <p className="text-sm font-medium">{t('actions.none')}</p>
              </div>
            ) : (
              actions.map((action) => (
                <div key={action} className="flex items-start gap-3 rounded-xl bg-muted px-3 py-2">
                  <p className="text-sm">{action}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
