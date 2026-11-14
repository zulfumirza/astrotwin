import type { ComponentType, SVGProps } from 'react'
import {
  ActivityIcon,
  BellIcon,
  GearIcon,
  HomeIcon,
  PredictionIcon,
  RecoveryIcon,
  ReportsIcon,
  SleepIcon,
  TrendsIcon,
} from './components/bionis/icons'

export type TimelineOptionValue = '7d' | '14d' | '30d' | '90d'

export const timelineOptions: Array<{
  value: TimelineOptionValue
  label: string
}> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const avatarSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88" fill="none">
    <rect width="88" height="88" rx="16" fill="#E0F2FE"/>
    <circle cx="44" cy="34" r="16" fill="#0886FD"/>
    <path d="M18 78C18 62.536 29.6406 52 44 52C58.3594 52 70 62.536 70 78" fill="#00509B"/>
  </svg>`,
)}`

export const currentUser = {
  name: 'Elena Rostova',
  email: 'elena.rostova@bionis.health',
  age: 31,
  planStatus: 'Active Plan',
  avatar: avatarSvg,
}

export type NavigationItem = {
  name: string
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  badge?: number
}

export const navigationGroups: Array<{
  label: string
  items: NavigationItem[]
}> = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: HomeIcon },
      { name: 'Sleep', href: '/sleep', icon: SleepIcon },
      { name: 'Activity', href: '/activity', icon: ActivityIcon },
      { name: 'Recovery', href: '/recovery', icon: RecoveryIcon },
    ],
  },
  {
    label: 'Insights',
    items: [
      { name: 'Trends', href: '/trends', icon: TrendsIcon },
      { name: 'Predictions', href: '/predictions', icon: PredictionIcon },
      { name: 'Reports', href: '/reports', icon: ReportsIcon },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Notifications', href: '/notifications', icon: BellIcon, badge: 3 },
      { name: 'Settings', href: '/settings', icon: GearIcon },
    ],
  },
]

export type WellnessSummary = {
  condition: string
  score: number
  summary: { before: string; highlight: string; after: string }
}

export const wellnessByTimeline: Record<TimelineOptionValue, WellnessSummary> = {
  '7d': {
    condition: 'Optimal Readiness',
    score: 86,
    summary: {
      before: 'Your autonomic balance and resting heart rate are ',
      highlight: '12% stronger than your 30-day baseline',
      after: ', with steady deep-sleep recovery across five of seven nights.',
    },
  },
  '14d': {
    condition: 'Steady Momentum',
    score: 83,
    summary: {
      before: 'Cardiovascular strain and sleep consistency are ',
      highlight: 'trending upward (+6% overall)',
      after: ' following reduced late-evening screen exposure.',
    },
  },
  '30d': {
    condition: 'Strong Baseline',
    score: 81,
    summary: {
      before: 'Monthly recovery resilience remained ',
      highlight: 'above target for 22 of 30 days',
      after: ', supporting moderate-to-high aerobic training blocks.',
    },
  },
  '90d': {
    condition: 'Peak Adaptation',
    score: 84,
    summary: {
      before: 'Quarterly VO2 capacity and nocturnal HRV improved ',
      highlight: 'by 9.4% since August',
      after: ' with consistent circadian wake windows.',
    },
  },
}

export type KeyMetricIcon =
  | 'heart'
  | 'walk'
  | 'moon'
  | 'battery'
  | 'heartbeat'
  | 'nurse'

export type KeyMetric = {
  id: string
  label: string
  value: string
  unit: string
  icon: KeyMetricIcon
  trend: { direction: 'up' | 'down'; emphasis: string; label: string }
}

export const keyMetricsByTimeline: Record<TimelineOptionValue, KeyMetric[]> = {
  '7d': [
    { id: 'rhr', label: 'Resting Heart Rate', value: '54', unit: 'bpm', icon: 'heart', trend: { direction: 'down', emphasis: '-3 bpm', label: 'vs last week' } },
    { id: 'steps', label: 'Daily Steps', value: '9,420', unit: 'steps', icon: 'walk', trend: { direction: 'up', emphasis: '+14%', label: 'vs weekly avg' } },
    { id: 'sleep', label: 'Sleep Duration', value: '7.6', unit: 'hrs', icon: 'moon', trend: { direction: 'up', emphasis: '+28m', label: 'vs target' } },
    { id: 'recovery', label: 'Recovery Score', value: '86', unit: '%', icon: 'battery', trend: { direction: 'up', emphasis: '+5%', label: 'vs last week' } },
  ],
  '14d': [
    { id: 'rhr', label: 'Resting Heart Rate', value: '55', unit: 'bpm', icon: 'heart', trend: { direction: 'down', emphasis: '-2 bpm', label: 'vs prior 14d' } },
    { id: 'steps', label: 'Daily Steps', value: '8,950', unit: 'steps', icon: 'walk', trend: { direction: 'up', emphasis: '+9%', label: 'vs prior 14d' } },
    { id: 'sleep', label: 'Sleep Duration', value: '7.4', unit: 'hrs', icon: 'moon', trend: { direction: 'up', emphasis: '+18m', label: 'vs prior 14d' } },
    { id: 'recovery', label: 'Recovery Score', value: '83', unit: '%', icon: 'battery', trend: { direction: 'up', emphasis: '+4%', label: 'vs prior 14d' } },
  ],
  '30d': [
    { id: 'rhr', label: 'Resting Heart Rate', value: '56', unit: 'bpm', icon: 'heart', trend: { direction: 'down', emphasis: '-4 bpm', label: 'vs last month' } },
    { id: 'steps', label: 'Daily Steps', value: '8,640', unit: 'steps', icon: 'walk', trend: { direction: 'up', emphasis: '+11%', label: 'vs last month' } },
    { id: 'sleep', label: 'Sleep Duration', value: '7.3', unit: 'hrs', icon: 'moon', trend: { direction: 'up', emphasis: '+15m', label: 'vs last month' } },
    { id: 'recovery', label: 'Recovery Score', value: '81', unit: '%', icon: 'battery', trend: { direction: 'up', emphasis: '+3%', label: 'vs last month' } },
  ],
  '90d': [
    { id: 'rhr', label: 'Resting Heart Rate', value: '55', unit: 'bpm', icon: 'heart', trend: { direction: 'down', emphasis: '-5 bpm', label: 'vs last quarter' } },
    { id: 'steps', label: 'Daily Steps', value: '9,110', unit: 'steps', icon: 'walk', trend: { direction: 'up', emphasis: '+16%', label: 'vs last quarter' } },
    { id: 'sleep', label: 'Sleep Duration', value: '7.5', unit: 'hrs', icon: 'moon', trend: { direction: 'up', emphasis: '+24m', label: 'vs last quarter' } },
    { id: 'recovery', label: 'Recovery Score', value: '84', unit: '%', icon: 'battery', trend: { direction: 'up', emphasis: '+7%', label: 'vs last quarter' } },
  ],
}

export const trendsMetricsByTimeline: Record<TimelineOptionValue, KeyMetric[]> = {
  '7d': [
    { id: 'hrv', label: 'Average HRV', value: '74', unit: 'ms', icon: 'heartbeat', trend: { direction: 'up', emphasis: '+8 ms', label: 'vs 30d baseline' } },
    { id: 'sleep-eff', label: 'Sleep Efficiency', value: '91', unit: '%', icon: 'moon', trend: { direction: 'up', emphasis: '+4%', label: 'vs last week' } },
    { id: 'strain', label: 'Active Strain', value: '13.4', unit: 'idx', icon: 'walk', trend: { direction: 'up', emphasis: '+1.2', label: 'optimal zone' } },
    { id: 'readiness', label: 'Recovery Index', value: '86', unit: '%', icon: 'nurse', trend: { direction: 'up', emphasis: '+5%', label: 'vs last week' } },
  ],
  '14d': [
    { id: 'hrv', label: 'Average HRV', value: '71', unit: 'ms', icon: 'heartbeat', trend: { direction: 'up', emphasis: '+5 ms', label: 'vs prior 14d' } },
    { id: 'sleep-eff', label: 'Sleep Efficiency', value: '89', unit: '%', icon: 'moon', trend: { direction: 'up', emphasis: '+2%', label: 'vs prior 14d' } },
    { id: 'strain', label: 'Active Strain', value: '12.8', unit: 'idx', icon: 'walk', trend: { direction: 'up', emphasis: '+0.8', label: 'balanced load' } },
    { id: 'readiness', label: 'Recovery Index', value: '83', unit: '%', icon: 'nurse', trend: { direction: 'up', emphasis: '+4%', label: 'vs prior 14d' } },
  ],
  '30d': [
    { id: 'hrv', label: 'Average HRV', value: '69', unit: 'ms', icon: 'heartbeat', trend: { direction: 'up', emphasis: '+6 ms', label: 'vs last month' } },
    { id: 'sleep-eff', label: 'Sleep Efficiency', value: '88', unit: '%', icon: 'moon', trend: { direction: 'up', emphasis: '+3%', label: 'vs last month' } },
    { id: 'strain', label: 'Active Strain', value: '12.5', unit: 'idx', icon: 'walk', trend: { direction: 'down', emphasis: '-0.4', label: 'lower fatigue' } },
    { id: 'readiness', label: 'Recovery Index', value: '81', unit: '%', icon: 'nurse', trend: { direction: 'up', emphasis: '+3%', label: 'vs last month' } },
  ],
  '90d': [
    { id: 'hrv', label: 'Average HRV', value: '72', unit: 'ms', icon: 'heartbeat', trend: { direction: 'up', emphasis: '+9 ms', label: 'vs last quarter' } },
    { id: 'sleep-eff', label: 'Sleep Efficiency', value: '90', unit: '%', icon: 'moon', trend: { direction: 'up', emphasis: '+5%', label: 'vs last quarter' } },
    { id: 'strain', label: 'Active Strain', value: '13.1', unit: 'idx', icon: 'walk', trend: { direction: 'up', emphasis: '+1.1', label: 'progressive load' } },
    { id: 'readiness', label: 'Recovery Index', value: '84', unit: '%', icon: 'nurse', trend: { direction: 'up', emphasis: '+7%', label: 'vs last quarter' } },
  ],
}

export type SleepBreakdownPoint = {
  label: string
  labelLines: string[]
  fullDate: string
  hours: number
}

export function getSleepBreakdown(timeline: TimelineOptionValue): {
  points: SleepBreakdownPoint[]
  flaggedNights: number
} {
  if (timeline === '7d') {
    return {
      flaggedNights: 2,
      points: [
        { label: 'Mon 07', labelLines: ['Mon', 'Nov 7'], fullDate: 'Monday, Nov 7', hours: 7.8 },
        { label: 'Tue 08', labelLines: ['Tue', 'Nov 8'], fullDate: 'Tuesday, Nov 8', hours: 6.1 },
        { label: 'Wed 09', labelLines: ['Wed', 'Nov 9'], fullDate: 'Wednesday, Nov 9', hours: 8.2 },
        { label: 'Thu 10', labelLines: ['Thu', 'Nov 10'], fullDate: 'Thursday, Nov 10', hours: 7.4 },
        { label: 'Fri 11', labelLines: ['Fri', 'Nov 11'], fullDate: 'Friday, Nov 11', hours: 5.9 },
        { label: 'Sat 12', labelLines: ['Sat', 'Nov 12'], fullDate: 'Saturday, Nov 12', hours: 8.6 },
        { label: 'Sun 13', labelLines: ['Sun', 'Nov 13'], fullDate: 'Sunday, Nov 13', hours: 7.9 },
      ],
    }
  }
  if (timeline === '14d') {
    return {
      flaggedNights: 3,
      points: [
        { label: 'Oct 31–Nov 1', labelLines: ['Oct 31', '–Nov 1'], fullDate: 'Oct 31 – Nov 1', hours: 7.1 },
        { label: 'Nov 2–3', labelLines: ['Nov', '2–3'], fullDate: 'Nov 2 – Nov 3', hours: 7.6 },
        { label: 'Nov 4–5', labelLines: ['Nov', '4–5'], fullDate: 'Nov 4 – Nov 5', hours: 6.3 },
        { label: 'Nov 6–7', labelLines: ['Nov', '6–7'], fullDate: 'Nov 6 – Nov 7', hours: 8.0 },
        { label: 'Nov 8–9', labelLines: ['Nov', '8–9'], fullDate: 'Nov 8 – Nov 9', hours: 7.2 },
        { label: 'Nov 10–11', labelLines: ['Nov', '10–11'], fullDate: 'Nov 10 – Nov 11', hours: 6.4 },
        { label: 'Nov 12–13', labelLines: ['Nov', '12–13'], fullDate: 'Nov 12 – Nov 13', hours: 8.3 },
      ],
    }
  }
  if (timeline === '30d') {
    return {
      flaggedNights: 5,
      points: [
        { label: 'Oct 15–19', labelLines: ['Oct', '15–19'], fullDate: 'Oct 15 – Oct 19', hours: 6.9 },
        { label: 'Oct 20–24', labelLines: ['Oct', '20–24'], fullDate: 'Oct 20 – Oct 24', hours: 7.4 },
        { label: 'Oct 25–29', labelLines: ['Oct', '25–29'], fullDate: 'Oct 25 – Oct 29', hours: 7.8 },
        { label: 'Oct 30–Nov 3', labelLines: ['Oct 30', '–Nov 3'], fullDate: 'Oct 30 – Nov 3', hours: 7.2 },
        { label: 'Nov 4–8', labelLines: ['Nov', '4–8'], fullDate: 'Nov 4 – Nov 8', hours: 6.7 },
        { label: 'Nov 9–13', labelLines: ['Nov', '9–13'], fullDate: 'Nov 9 – Nov 13', hours: 7.9 },
      ],
    }
  }
  return {
    flaggedNights: 9,
    points: [
      { label: 'Aug 16–30', labelLines: ['Aug', '16–30'], fullDate: 'Aug 16 – Aug 30', hours: 7.0 },
      { label: 'Aug 31–Sep 14', labelLines: ['Sep', '1–14'], fullDate: 'Aug 31 – Sep 14', hours: 7.3 },
      { label: 'Sep 15–29', labelLines: ['Sep', '15–29'], fullDate: 'Sep 15 – Sep 29', hours: 7.5 },
      { label: 'Sep 30–Oct 14', labelLines: ['Oct', '1–14'], fullDate: 'Sep 30 – Oct 14', hours: 7.2 },
      { label: 'Oct 15–29', labelLines: ['Oct', '15–29'], fullDate: 'Oct 15 – Oct 29', hours: 7.6 },
      { label: 'Oct 30–Nov 13', labelLines: ['Nov', '1–13'], fullDate: 'Oct 30 – Nov 13', hours: 7.8 },
    ],
  }
}

export type ActivityTrendPoint = {
  dateKey: string
  label: string
  fullDate: string
  showTick: boolean
  steps: number
  recovery: number
}

export function getActivityTrend(
  timeline: TimelineOptionValue,
): ActivityTrendPoint[] {
  const daysMap: Record<TimelineOptionValue, number> = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
    '90d': 30,
  }
  const count = daysMap[timeline]
  const baseSteps = [7.4, 8.9, 6.8, 10.2, 9.5, 11.1, 8.4, 7.9, 9.8, 10.6, 8.2, 7.5, 10.9, 9.4]
  const baseRecovery = [7.6, 8.1, 7.2, 8.4, 7.9, 8.8, 8.6, 7.8, 8.3, 8.5, 7.4, 8.0, 8.9, 8.7]

  const anchor = new Date(2026, 10, 13)
  const points: ActivityTrendPoint[] = []

  for (let i = count - 1; i >= 0; i--) {
    const stepMultiplier = timeline === '90d' ? 3 : 1
    const date = new Date(anchor)
    date.setDate(anchor.getDate() - i * stepMultiplier)

    const month = date.toLocaleString('en-US', { month: 'short' })
    const day = date.getDate()
    const weekday = date.toLocaleString('en-US', { weekday: 'short' })
    const idx = count - 1 - i

    const stepsVal = Number(
      (baseSteps[idx % baseSteps.length] + Math.sin(idx * 0.7) * 0.6).toFixed(1),
    )
    const recoveryVal = Number(
      Math.min(
        9.6,
        Math.max(5.8, baseRecovery[idx % baseRecovery.length] + Math.cos(idx * 0.6) * 0.4),
      ).toFixed(1),
    )

    const tickStep = count <= 7 ? 1 : count <= 14 ? 2 : 5
    const showTick = idx % tickStep === 0 || idx === count - 1

    points.push({
      dateKey: `${month}-${day}-${idx}`,
      label: count <= 7 ? weekday : `${month} ${day}`,
      fullDate: `${weekday}, ${month} ${day}`,
      showTick,
      steps: stepsVal,
      recovery: recoveryVal,
    })
  }

  return points
}

export type HealthPredictionTone = 'warning' | 'success' | 'danger'

export type HealthPrediction = {
  id: string
  title: string
  description: string
  tone: HealthPredictionTone
}

export const healthPredictions: HealthPrediction[] = [
  {
    id: 'pred-1',
    title: 'Mild mid-week sleep debt risk',
    description: 'Late bedtimes on Tuesday & Friday lowered REM efficiency by 9%.',
    tone: 'warning',
  },
  {
    id: 'pred-2',
    title: 'High aerobic readiness window',
    description: 'HRV rebound indicates optimal capacity for threshold cardio.',
    tone: 'success',
  },
  {
    id: 'pred-3',
    title: 'Elevated evening cortisol trend',
    description: 'High screen stimulation after 10:30 PM delayed sleep onset.',
    tone: 'danger',
  },
]

export type BodyVitalTone = 'good' | 'neutral' | 'warn'

export const bodyVitals: Array<{
  id: string
  label: string
  value: string
  tone: BodyVitalTone
}> = [
  { id: 'hr', label: 'Resting Heart Rate', value: '54 bpm', tone: 'good' },
  { id: 'hrv', label: 'Heart Rate Variability', value: '74 ms', tone: 'good' },
  { id: 'spo2', label: 'Blood Oxygen (SpO₂)', value: '98%', tone: 'good' },
  { id: 'temp', label: 'Skin Temperature', value: '+0.2 °C', tone: 'neutral' },
  { id: 'resp', label: 'Respiratory Rate', value: '14.6 rpm', tone: 'good' },
  { id: 'bp', label: 'Estimated BP Trend', value: '116/74', tone: 'neutral' },
]

export type RecommendedAction = {
  id: string
  title: string
  description: string
  icon: 'bed' | 'drop' | 'highKnees' | 'voice'
}

export const recommendedActions: RecommendedAction[] = [
  {
    id: 'act-1',
    title: 'Shift wind-down to 10:15 PM',
    description: 'Gain ~35m of restorative deep sleep before midnight.',
    icon: 'bed',
  },
  {
    id: 'act-2',
    title: 'Hydrate 500 ml post-wake',
    description: 'Supports morning blood volume and stabilizes resting pulse.',
    icon: 'drop',
  },
  {
    id: 'act-3',
    title: '35-min Zone 2 session today',
    description: 'Capitalize on 86% readiness without spiking strain.',
    icon: 'highKnees',
  },
  {
    id: 'act-4',
    title: '5-min resonant breathing',
    description: 'Lower evening sympathetic tone before bedtime.',
    icon: 'voice',
  },
]

export type SleepRecoveryTrendPoint = {
  dateKey: string
  formattedDate: string
  fullDate: string
  showTick: boolean
  sleepHrs: number
  recoveryScore: number
  sleepPlot: number
  recoveryPlot: number
}

export function getSleepRecoveryTrend(
  timeline: TimelineOptionValue,
): SleepRecoveryTrendPoint[] {
  const countMap: Record<TimelineOptionValue, number> = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
    '90d': 30,
  }
  const count = countMap[timeline]
  const anchor = new Date(2026, 10, 13)
  const points: SleepRecoveryTrendPoint[] = []

  for (let i = count - 1; i >= 0; i--) {
    const stepDays = timeline === '90d' ? 3 : 1
    const d = new Date(anchor)
    d.setDate(anchor.getDate() - i * stepDays)
    const idx = count - 1 - i
    const month = d.toLocaleString('en-US', { month: 'short' })
    const day = d.getDate()

    const sleepHrs = Number(
      Math.min(8.8, Math.max(5.8, 7.2 + Math.sin(idx * 0.55) * 0.9 + (idx / count) * 0.4)).toFixed(1),
    )
    const recoveryScore = Math.round(
      Math.min(95, Math.max(62, 76 + Math.cos(idx * 0.48) * 10 + (idx / count) * 8)),
    )

    const tickEvery = count <= 7 ? 1 : count <= 14 ? 2 : 5
    const showTick = idx % tickEvery === 0 || idx === count - 1

    points.push({
      dateKey: `${month}-${day}-${idx}`,
      formattedDate: `${month} ${day}`,
      fullDate: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      showTick,
      sleepHrs,
      recoveryScore,
      sleepPlot: Math.round((sleepHrs / 10) * 100),
      recoveryPlot: recoveryScore,
    })
  }

  return points
}

export type RecoveryFactor = {
  id: 'sleep' | 'steps' | 'stress' | 'screen' | 'bedtime'
  label: string
  icon: 'moon' | 'walk' | 'warning' | 'alert' | 'bed'
  fillPercentage: number
  value: string
}

export const recoveryFactors: RecoveryFactor[] = [
  { id: 'sleep', label: 'Sleep Consistency', icon: 'moon', fillPercentage: 86, value: '+14%' },
  { id: 'steps', label: 'Daytime Movement', icon: 'walk', fillPercentage: 78, value: '+9%' },
  { id: 'stress', label: 'Autonomic Stress', icon: 'warning', fillPercentage: 42, value: '-6%' },
  { id: 'screen', label: 'Late Screen Time', icon: 'alert', fillPercentage: 28, value: '-11%' },
  { id: 'bedtime', label: 'Bedtime Window', icon: 'bed', fillPercentage: 82, value: '+12%' },
]

export const recoveryFactorsByTimeline: Record<TimelineOptionValue, RecoveryFactor[]> = {
  '7d': recoveryFactors,
  '14d': [
    { id: 'sleep', label: 'Sleep Consistency', icon: 'moon', fillPercentage: 82, value: '+11%' },
    { id: 'steps', label: 'Daytime Movement', icon: 'walk', fillPercentage: 74, value: '+8%' },
    { id: 'stress', label: 'Autonomic Stress', icon: 'warning', fillPercentage: 46, value: '-5%' },
    { id: 'screen', label: 'Late Screen Time', icon: 'alert', fillPercentage: 34, value: '-9%' },
    { id: 'bedtime', label: 'Bedtime Window', icon: 'bed', fillPercentage: 79, value: '+10%' },
  ],
  '30d': [
    { id: 'sleep', label: 'Sleep Consistency', icon: 'moon', fillPercentage: 79, value: '+9%' },
    { id: 'steps', label: 'Daytime Movement', icon: 'walk', fillPercentage: 71, value: '+7%' },
    { id: 'stress', label: 'Autonomic Stress', icon: 'warning', fillPercentage: 49, value: '-4%' },
    { id: 'screen', label: 'Late Screen Time', icon: 'alert', fillPercentage: 39, value: '-7%' },
    { id: 'bedtime', label: 'Bedtime Window', icon: 'bed', fillPercentage: 75, value: '+8%' },
  ],
  '90d': [
    { id: 'sleep', label: 'Sleep Consistency', icon: 'moon', fillPercentage: 84, value: '+13%' },
    { id: 'steps', label: 'Daytime Movement', icon: 'walk', fillPercentage: 80, value: '+11%' },
    { id: 'stress', label: 'Autonomic Stress', icon: 'warning', fillPercentage: 38, value: '-8%' },
    { id: 'screen', label: 'Late Screen Time', icon: 'alert', fillPercentage: 30, value: '-10%' },
    { id: 'bedtime', label: 'Bedtime Window', icon: 'bed', fillPercentage: 81, value: '+11%' },
  ],
}

export type HeatmapTile = 'low' | 'med' | 'high'

export type HeatmapColumn = {
  tiles: Array<{
    id: string
    level: HeatmapTile
    score: number
    date: string
    status: string
  }>
}

export const heatmapDateLabels = ['Oct 10', 'Oct 21', 'Nov 2', 'Nov 13']

export function getRecoveryHeatmap(timeline: TimelineOptionValue): {
  columns: HeatmapColumn[]
  dateLabels: string[]
} {
  const seedShift =
    timeline === '7d' ? 0 : timeline === '14d' ? 1 : timeline === '30d' ? 2 : 3
  const anchor = new Date(2026, 10, 13)
  const columns: HeatmapColumn[] = []

  const scoresMatrix = [
    [64, 72, 78, 84, 70],
    [68, 79, 86, 82, 74],
    [59, 67, 75, 88, 91],
    [76, 83, 89, 77, 81],
    [62, 71, 80, 85, 90],
    [78, 84, 92, 87, 79],
    [73, 81, 86, 93, 88],
  ]

  for (let col = 0; col < 7; col++) {
    const tiles = []
    for (let row = 0; row < 5; row++) {
      const daysBack = (6 - col) * 5 + (4 - row)
      const d = new Date(anchor)
      d.setDate(anchor.getDate() - daysBack)
      const rawScore = scoresMatrix[(col + seedShift) % 7][row]
      const score = Math.min(97, Math.max(54, rawScore + seedShift * 2))
      const level: HeatmapTile =
        score >= 84 ? 'high' : score >= 70 ? 'med' : 'low'
      const status =
        level === 'high'
          ? 'Peak Recovery'
          : level === 'med'
            ? 'Steady Recovery'
            : 'Rest Needed'

      tiles.push({
        id: `tile-${col}-${row}`,
        level,
        score,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        status,
      })
    }
    columns.push({ tiles })
  }

  const labelsByTimeline: Record<TimelineOptionValue, string[]> = {
    '7d': ['Oct 10', 'Oct 21', 'Nov 2', 'Nov 13'],
    '14d': ['Oct 10', 'Oct 21', 'Nov 2', 'Nov 13'],
    '30d': ['Oct 14', 'Oct 24', 'Nov 3', 'Nov 13'],
    '90d': ['Aug 16', 'Sep 15', 'Oct 15', 'Nov 13'],
  }

  return { columns, dateLabels: labelsByTimeline[timeline] }
}

export const recoveryHeatmapData: HeatmapColumn[] =
  getRecoveryHeatmap('7d').columns

export type NotificationIcon =
  | 'moon'
  | 'check'
  | 'heart'
  | 'alert'
  | 'activity'
  | 'battery'

export type NotificationTone = 'warning' | 'success' | 'info' | 'danger'

export type NotificationItem = {
  id: string
  title: string
  description: string
  time: string
  unread: boolean
  icon: NotificationIcon
  tone: NotificationTone
}

export const notifications: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Optimal recovery reached',
    description: 'Your morning HRV hit 74 ms (+8 ms above baseline).',
    time: '25m ago',
    unread: true,
    icon: 'battery',
    tone: 'success',
  },
  {
    id: 'n-2',
    title: 'Short sleep night flagged',
    description: 'Friday night sleep was 5.9h — consider an earlier wind-down.',
    time: '3h ago',
    unread: true,
    icon: 'moon',
    tone: 'warning',
  },
  {
    id: 'n-3',
    title: 'Weekly step milestone met',
    description: 'You crossed 65,940 steps across the last 7 days.',
    time: 'Yesterday',
    unread: true,
    icon: 'activity',
    tone: 'info',
  },
  {
    id: 'n-4',
    title: 'Evening strain spike',
    description: 'Heart rate stayed elevated past 10:45 PM after late workout.',
    time: '2 days ago',
    unread: false,
    icon: 'alert',
    tone: 'danger',
  },
  {
    id: 'n-5',
    title: 'Resting pulse steady',
    description: 'Resting heart rate stabilized at 54 bpm for 4 straight days.',
    time: '4 days ago',
    unread: false,
    icon: 'heart',
    tone: 'success',
  },
]

export const profileHealthSummary = {
  wellnessScore: 86,
  condition: 'Optimal Readiness',
  summary: {
    before: 'Cardiovascular recovery is ',
    highlight: '12% ahead of baseline',
    after: ' with consistent morning HRV.',
  },
  vitals: [
    { label: 'RHR', value: '54 bpm', tone: 'good' as BodyVitalTone },
    { label: 'HRV', value: '74 ms', tone: 'good' as BodyVitalTone },
    { label: 'SpO₂', value: '98%', tone: 'good' as BodyVitalTone },
    { label: 'Strain', value: '13.4', tone: 'warn' as BodyVitalTone },
  ],
}
