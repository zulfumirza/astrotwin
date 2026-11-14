import { useState, type ComponentType, type SVGProps } from 'react'
import {
  ActivityIcon,
  AlertDiamondIcon,
  AlertTriangleIcon,
  BatteryChargingIcon,
  BedIcon,
  BlingFilledIcon,
  CalendarIcon,
  CheckCircleRegularIcon,
  DropIcon,
  HeartbeatFilledIcon,
  HighKneesIcon,
  MoonStarsIcon,
  ReportsIcon,
  Sparkles3FilledIcon,
  VoiceIcon,
} from './icons'
import {
  ActivityTrendChart,
  KeyMetricCard,
  RecoveryFactorsCard,
  RecoveryHeatmapCard,
  ScoreDonut,
  SleepBreakdownChart,
  SleepRecoveryTrendChart,
} from './shared'
import { useTheme } from './theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  bodyVitals,
  currentUser,
  getActivityTrend,
  getRecoveryHeatmap,
  getSleepBreakdown,
  getSleepRecoveryTrend,
  healthPredictions,
  keyMetricsByTimeline,
  notifications as initialNotifications,
  profileHealthSummary,
  recommendedActions,
  recoveryFactorsByTimeline,
  timelineOptions,
  trendsMetricsByTimeline,
  wellnessByTimeline,
  type HealthPredictionTone,
  type NotificationIcon,
  type NotificationTone,
  type RecommendedAction,
  type TimelineOptionValue,
} from '../../data'
import { cn } from '@/lib/utils'

function TimelineSelect({
  timeline,
  onChange,
}: {
  timeline: TimelineOptionValue
  onChange: (value: TimelineOptionValue) => void
}) {
  const selectedLabel =
    timelineOptions.find((option) => option.value === timeline)?.label ??
    'Last 7 days'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0 gap-1.5 rounded-lg px-3.5 text-sm font-normal tracking-tight shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
        >
          <CalendarIcon className="size-4" />
          <span>{selectedLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bionis-dashboard min-w-40">
        <DropdownMenuRadioGroup
          value={timeline}
          onValueChange={(value) => onChange(value as TimelineOptionValue)}
        >
          {timelineOptions.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="font-normal text-muted-foreground data-[state=checked]:font-medium data-[state=checked]:text-foreground"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="truncate text-xl font-medium tracking-tight md:text-2xl">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">{subtitle}</p>
      </div>
      {right}
    </div>
  )
}

export function SleepContent() {
  const [timeline, setTimeline] = useState<TimelineOptionValue>('7d')
  const sleepBreakdown = getSleepBreakdown(timeline)
  const trendData = getSleepRecoveryTrend(timeline)
  const sleepMetric = keyMetricsByTimeline[timeline].find((m) => m.id === 'sleep')
  const sleepEff = trendsMetricsByTimeline[timeline].find((m) => m.id === 'sleep-eff')

  const sleepStages = [
    { label: 'Deep Sleep', duration: '1h 42m', share: '22%', tone: 'var(--chart-sleep)' },
    { label: 'REM Sleep', duration: '1h 54m', share: '25%', tone: 'var(--chart-steps)' },
    { label: 'Light Sleep', duration: '3h 48m', share: '50%', tone: 'var(--chart-recovery)' },
    { label: 'Awake', duration: '14m', share: '3%', tone: 'var(--prediction-warn)' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Sleep"
        subtitle="Nightly sleep architecture, consistency, and efficiency"
        right={<TimelineSelect timeline={timeline} onChange={setTimeline} />}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sleepMetric ? <KeyMetricCard metric={sleepMetric} /> : null}
        {sleepEff ? <KeyMetricCard metric={sleepEff} /> : null}
        {sleepStages.slice(0, 2).map((stage) => (
          <article
            key={stage.label}
            className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4"
          >
            <div className="flex items-center gap-2">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: stage.tone }}
              >
                <MoonStarsIcon className="size-3.5" />
              </span>
              <p className="text-sm font-medium tracking-tight">{stage.label}</p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-2.5xl font-medium leading-none">{stage.duration}</p>
              <p className="text-xs text-muted-foreground">{stage.share} of total sleep</p>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SleepBreakdownChart
          key={`sleep-page-${timeline}`}
          data={sleepBreakdown.points}
          flaggedNights={sleepBreakdown.flaggedNights}
        />
        <SleepRecoveryTrendChart key={`sleep-trend-${timeline}`} data={trendData} />
      </section>
    </div>
  )
}

export function ActivityContent() {
  const [timeline, setTimeline] = useState<TimelineOptionValue>('7d')
  const selectedLabel =
    timelineOptions.find((option) => option.value === timeline)?.label ??
    'Last 7 days'
  const activityTrend = getActivityTrend(timeline)
  const stepsMetric = keyMetricsByTimeline[timeline].find((m) => m.id === 'steps')
  const strainMetric = trendsMetricsByTimeline[timeline].find((m) => m.id === 'strain')
  const rhrMetric = keyMetricsByTimeline[timeline].find((m) => m.id === 'rhr')

  const zones = [
    { zone: 'Zone 2 Aerobic', minutes: '142 min', pct: 68, color: 'var(--vital-good)' },
    { zone: 'Zone 3 Tempo', minutes: '48 min', pct: 42, color: 'var(--bionis-blue)' },
    { zone: 'Zone 4 Threshold', minutes: '22 min', pct: 26, color: 'var(--prediction-warn)' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Activity"
        subtitle="Daily movement, cardiovascular strain, and heart rate zones"
        right={<TimelineSelect timeline={timeline} onChange={setTimeline} />}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stepsMetric ? <KeyMetricCard metric={stepsMetric} /> : null}
        {strainMetric ? <KeyMetricCard metric={strainMetric} /> : null}
        {rhrMetric ? <KeyMetricCard metric={rhrMetric} /> : null}
        <article className="flex min-h-37.5 flex-col justify-between rounded-2xl border p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--metric-steps) text-white">
              <ActivityIcon className="size-3.5" />
            </span>
            <p className="text-sm font-medium tracking-tight">Active Calories</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="leading-none">
              <span className="text-2.5xl font-medium">640</span>{' '}
              <span className="font-normal">kcal</span>
            </p>
            <p className="text-xs text-muted-foreground">Avg daily burn this period</p>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ActivityTrendChart
          key={`activity-page-${timeline}`}
          data={activityTrend}
          periodLabel={selectedLabel}
          className="xl:col-span-2"
        />

        <article className="flex flex-col justify-between gap-4 rounded-2xl border bg-background p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--bionis-blue) text-white">
              <HighKneesIcon className="size-4" />
            </span>
            <h3 className="font-medium">Training Zone Split</h3>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-4">
            {zones.map((item) => (
              <div key={item.zone} className="space-y-2 rounded-xl bg-muted/60 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.zone}</span>
                  <span className="text-muted-foreground tabular-nums">{item.minutes}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

export function RecoveryContent() {
  const [timeline, setTimeline] = useState<TimelineOptionValue>('7d')
  const wellness = wellnessByTimeline[timeline]
  const factors = recoveryFactorsByTimeline[timeline]
  const heatmap = getRecoveryHeatmap(timeline)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Recovery"
        subtitle="Autonomic readiness, HRV adaptation, and daily contributors"
        right={<TimelineSelect timeline={timeline} onChange={setTimeline} />}
      />

      <section className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border p-5">
        <div className="space-y-2">
          <span className="inline-flex w-fit rounded-xl bg-(--live)/10 px-3 py-1 text-sm font-medium text-(--live)">
            {wellness.condition}
          </span>
          <h2 className="text-lg font-medium">Readiness Assessment</h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {wellness.summary.before}
            <span className="font-medium text-foreground">{wellness.summary.highlight}</span>
            {wellness.summary.after}
          </p>
        </div>
        <ScoreDonut value={wellness.score} label="Recovery" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RecoveryFactorsCard key={`rec-factors-${timeline}`} factors={factors} />
        <RecoveryHeatmapCard
          key={`rec-heatmap-${timeline}`}
          data={heatmap.columns}
          dateLabels={heatmap.dateLabels}
        />
      </section>
    </div>
  )
}

const predictionToneIcon: Record<
  HealthPredictionTone,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  warning: AlertTriangleIcon,
  success: CheckCircleRegularIcon,
  danger: AlertDiamondIcon,
}

const predictionToneClass: Record<HealthPredictionTone, string> = {
  warning: 'text-(--prediction-warn)',
  success: 'text-(--vital-good)',
  danger: 'text-(--prediction-danger)',
}

const actionIcons: Record<
  RecommendedAction['icon'],
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  bed: BedIcon,
  drop: DropIcon,
  highKnees: HighKneesIcon,
  voice: VoiceIcon,
}

export function PredictionsContent() {
  const [completedIds, setCompletedIds] = useState<string[]>([])

  const toggleAction = (id: string) => {
    setCompletedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Predictions"
        subtitle="7-day physiological outlook and personalized coaching actions"
      />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="flex flex-col gap-5 rounded-2xl border bg-[linear-gradient(180deg,rgb(99_102_241/0.08)_0%,transparent_42%)] p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--insight-prediction) text-white">
                <Sparkles3FilledIcon className="size-4" />
              </span>
              <h2 className="font-medium">7-Day Health Forecast</h2>
            </div>
            <span className="rounded-xl bg-background px-2.5 py-1.5 text-xs font-medium text-(--chart-period)">
              7 days outlook
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {healthPredictions.map((item) => {
              const Icon = predictionToneIcon[item.tone]
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl bg-muted px-3.5 py-3"
                >
                  <Icon
                    className={cn('mt-0.5 size-5 shrink-0', predictionToneClass[item.tone])}
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <article className="flex flex-col gap-5 rounded-2xl border bg-[linear-gradient(180deg,rgb(20_184_166/0.08)_0%,transparent_42%)] p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--insight-actions) text-white">
                <BlingFilledIcon className="size-4" />
              </span>
              <h2 className="font-medium">Coach Action Plan</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {completedIds.length}/{recommendedActions.length} completed
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {recommendedActions.map((action) => {
              const Icon = actionIcons[action.icon]
              const done = completedIds.includes(action.id)
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => toggleAction(action.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border border-transparent bg-muted px-3.5 py-3 text-left transition-colors hover:bg-accent',
                    done && 'opacity-70',
                  )}
                >
                  <Icon className="mt-0.5 size-5 shrink-0 text-foreground" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={cn('text-sm font-medium', done && 'line-through')}>
                      {action.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'mt-0.5 rounded-lg px-2 py-0.5 text-xs font-medium',
                      done
                        ? 'bg-(--live)/15 text-(--live)'
                        : 'bg-background text-muted-foreground',
                    )}
                  >
                    {done ? 'Done' : 'Mark'}
                  </span>
                </button>
              )
            })}
          </div>
        </article>
      </section>
    </div>
  )
}

export function ReportsContent() {
  const reports = [
    {
      id: 'rep-weekly',
      title: 'Weekly Biometric Digest',
      period: 'Nov 7 – Nov 13, 2026',
      score: '86 / 100',
      summary: 'HRV rose +8 ms with balanced Zone 2 cardiovascular strain.',
    },
    {
      id: 'rep-monthly',
      title: 'Monthly Sleep & Circadian Audit',
      period: 'Oct 15 – Nov 13, 2026',
      score: '81 / 100',
      summary: 'Average sleep duration 7.3 hrs; bedtime variance reduced by 19 min.',
    },
    {
      id: 'rep-quarterly',
      title: 'Quarterly Cardiorespiratory Review',
      period: 'Aug 16 – Nov 13, 2026',
      score: '84 / 100',
      summary: 'Resting heart rate decreased by 5 bpm alongside +16% daily step volume.',
    },
  ]

  const handleDownloadJson = (report: (typeof reports)[number]) => {
    const payload = {
      generatedAt: new Date().toISOString(),
      member: currentUser.name,
      report,
      vitals: bodyVitals,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Reports"
        subtitle="Exportable clinical and personal wellness summaries"
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {reports.map((report) => (
          <article
            key={report.id}
            className="flex flex-col justify-between gap-5 rounded-2xl border bg-background p-5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-(--chart-period-bg) text-(--chart-period)">
                  <ReportsIcon className="size-4" />
                </span>
                <span className="rounded-lg bg-(--live)/10 px-2.5 py-1 text-xs font-medium text-(--live)">
                  {report.score}
                </span>
              </div>
              <div className="space-y-1">
                <h2 className="font-medium">{report.title}</h2>
                <p className="text-xs text-muted-foreground">{report.period}</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {report.summary}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleDownloadJson(report)}
              className="w-full rounded-xl"
            >
              Export Report JSON
            </Button>
          </article>
        ))}
      </section>
    </div>
  )
}

const notificationIcons: Record<
  NotificationIcon,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  moon: MoonStarsIcon,
  check: CheckCircleRegularIcon,
  heart: HeartbeatFilledIcon,
  alert: AlertTriangleIcon,
  activity: ActivityIcon,
  battery: BatteryChargingIcon,
}

const notificationToneClass: Record<
  NotificationTone,
  { icon: string; bg: string }
> = {
  warning: {
    icon: 'text-(--prediction-warn)',
    bg: 'bg-(--chart-warn-bg)',
  },
  success: {
    icon: 'text-(--vital-good)',
    bg: 'bg-(--vital-good)/10',
  },
  info: {
    icon: 'text-(--chart-period)',
    bg: 'bg-(--chart-period-bg)',
  },
  danger: {
    icon: 'text-(--prediction-danger)',
    bg: 'bg-(--prediction-danger)/10',
  },
}

export function NotificationsContent() {
  const [items, setItems] = useState(initialNotifications)

  const markAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })))
  }

  const toggleRead = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, unread: !item.unread } : item,
      ),
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Notifications"
        subtitle="Biometric alerts, milestones, and recovery advisories"
        right={
          <Button type="button" variant="outline" onClick={markAllRead}>
            Mark all as read
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const Icon = notificationIcons[item.icon]
          const tone = notificationToneClass[item.tone]

          return (
            <div
              key={item.id}
              onClick={() => toggleRead(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleRead(item.id)
                }
              }}
              className="flex cursor-pointer items-start gap-4 rounded-2xl border bg-background p-4 transition-colors hover:bg-muted/40"
            >
              <span
                className={cn(
                  'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
                  tone.bg,
                  tone.icon,
                )}
              >
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{item.title}</p>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              {item.unread ? (
                <span
                  aria-label="Unread"
                  className="mt-2 size-2 shrink-0 rounded-full bg-(--live)"
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SettingsContent() {
  const { theme, setTheme } = useTheme()
  const [sleepGoal, setSleepGoal] = useState('8.0')
  const [stepGoal, setStepGoal] = useState('10000')
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Settings"
        subtitle="Manage appearance, biometric targets, and profile preferences"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-5 rounded-2xl border bg-background p-5"
        >
          <h2 className="text-lg font-medium">Profile & Targets</h2>
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
            <img
              src={currentUser.avatar}
              alt=""
              className="size-12 rounded-lg object-cover"
            />
            <div>
              <p className="font-medium">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">
                {currentUser.email} • {profileHealthSummary.condition}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Nightly Sleep Target (hrs)</span>
              <input
                type="number"
                step="0.5"
                min="5"
                max="11"
                value={sleepGoal}
                onChange={(e) => setSleepGoal(e.target.value)}
                className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Daily Step Target</span>
              <input
                type="number"
                step="500"
                min="2000"
                max="30000"
                value={stepGoal}
                onChange={(e) => setStepGoal(e.target.value)}
                className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit">Save Preferences</Button>
            {saved ? (
              <span className="text-sm font-medium text-(--live)">
                Targets updated
              </span>
            ) : null}
          </div>
        </form>

        <article className="flex flex-col gap-5 rounded-2xl border bg-background p-5">
          <h2 className="text-lg font-medium">Appearance</h2>
          <p className="text-sm text-muted-foreground">
            Choose how the Bionis dashboard looks across charts and surfaces.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={theme === option ? 'default' : 'outline'}
                onClick={() => setTheme(option)}
                className="capitalize"
              >
                {option}
              </Button>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
