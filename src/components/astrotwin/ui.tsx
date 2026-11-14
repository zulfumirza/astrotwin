// Small shared pieces for the AstroTwin pages. They reuse the existing design
// tokens and class recipes from the Bionis components (pills, cards, headers).
import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from 'react'
import {
  InfoIcon,
  OrbitIcon,
  RadiationIcon,
  SatelliteDishIcon,
  UsersIcon,
  WindIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { HazardId, Level, Tier } from '../../engine'
import { useI18n } from '../../i18n'
import { INFO, type InfoId } from '../../i18n/info'
import type { DataSource } from '../../services/http'

export const levelPill: Record<Level, string> = {
  nominal: 'bg-(--live)/10 text-(--live)',
  watch: 'bg-(--chart-warn-bg) text-(--chart-warn)',
  alert: 'bg-(--chart-warn-bg) text-(--chart-warn)',
  critical: 'bg-(--prediction-danger)/10 text-(--prediction-danger)',
}
export const levelText: Record<Level, string> = {
  nominal: 'text-(--vital-good)',
  watch: 'text-(--prediction-warn)',
  alert: 'text-(--chart-warn)',
  critical: 'text-(--prediction-danger)',
}
export const levelColor: Record<Level, string> = {
  nominal: 'var(--score)',
  watch: 'var(--prediction-warn)',
  alert: 'var(--chart-warn)',
  critical: 'var(--prediction-danger)',
}
export const tierLevel: Record<Tier, Level> = {
  routine: 'nominal',
  anomaly: 'alert',
  critical: 'critical',
}

export const hazardIcon: Record<HazardId, ComponentType<SVGProps<SVGSVGElement>>> = {
  radiation: RadiationIcon,
  isolation: UsersIcon,
  distance: SatelliteDishIcon,
  gravity: OrbitIcon,
  environment: WindIcon,
}
export const hazardColor: Record<HazardId, string> = {
  radiation: 'var(--metric-heart)',
  isolation: 'var(--metric-sleep)',
  distance: 'var(--metric-steps)',
  gravity: 'var(--metric-recovery)',
  environment: 'var(--prediction-warn)',
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle: string
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="truncate text-xl font-medium tracking-tight md:text-2xl">{title}</h1>
        <p className="text-sm text-muted-foreground md:text-base">{subtitle}</p>
      </div>
      {right}
    </div>
  )
}

export function Pill({ level, children, className }: { level: Level; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-xl px-3 py-1 text-sm font-medium',
        levelPill[level],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Tells the user whether a number is live, a cached copy or embedded data. */
export function SourceBadge({ source, at, className }: { source: DataSource | 'simulated'; at?: number; className?: string }) {
  const { t, lang } = useI18n()
  const label =
    source === 'live' ? t('src.live') : source === 'cache' ? t('src.cache') : source === 'simulated' ? t('src.simulated') : t('src.embedded')
  const time =
    at && source !== 'embedded' && source !== 'simulated'
      ? new Date(at).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
      : null
  return (
    <span
      title={source === 'simulated' ? t('src.simulatedTitle') : t('src.title')}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-background px-2.5 py-1.5 text-xs font-medium tracking-tight',
        source === 'live' ? 'text-(--live)' : source === 'cache' ? 'text-(--chart-warn)' : 'text-(--chart-period)',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          source === 'live' ? 'bg-(--live)' : source === 'cache' ? 'bg-(--chart-warn)' : 'bg-(--chart-period)',
        )}
      />
      {label}
      {time ? <span className="font-normal text-muted-foreground">{time}</span> : null}
    </span>
  )
}

/** Marks a panel whose crew data is simulated; same style as the Live / Embedded badges. */
export function SimulatedBadge({ className }: { className?: string }) {
  return <SourceBadge source="simulated" className={cn('bg-muted', className)} />
}

/** "Why this matters" info button: three plain-language lines per indicator. */
export function InfoButton({ id, name }: { id: InfoId; name: string }) {
  const { t, lang } = useI18n()
  const info = INFO[lang][id]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('info.open', { name })}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <InfoIcon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bionis-dashboard w-80 max-w-[calc(100vw-2rem)] p-3">
        <p className="text-sm font-medium">{t('info.title')}</p>
        <p className="mb-2 text-xs text-muted-foreground">{name}</p>
        <dl className="flex flex-col gap-2">
          {(
            [
              ['info.why', info.why],
              ['info.skew', info.skew],
              ['info.tell', info.tell],
            ] as const
          ).map(([key, body]) => (
            <div key={key} className="rounded-lg bg-muted px-2.5 py-2">
              <dt className="text-xs font-medium text-muted-foreground">{t(key)}</dt>
              <dd className="text-sm leading-snug">{body}</dd>
            </div>
          ))}
        </dl>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** "Simulated crew data" marker required on every data screen. */
export function SimBadge() {
  const { t } = useI18n()
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-(--chart-period-bg) px-3 py-1 text-xs font-medium text-(--chart-period)">
      {t('sim.badge')}
    </span>
  )
}

export function CardTitle({
  icon: Icon,
  color,
  children,
  right,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  color: string
  children: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: color }}
        >
          <Icon className="size-4" />
        </span>
        <h3 className="font-medium">{children}</h3>
      </div>
      {right}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-muted/60 p-3">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        {description ? <span className="text-xs leading-relaxed text-muted-foreground">{description}</span> : null}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-(--live) peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          variant={value === o.value ? 'default' : 'outline'}
          onClick={() => onChange(o.value)}
          className="min-w-10"
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export const AXIS_TICK = {
  fill: 'var(--muted-foreground)',
  fontSize: 10,
  fontFamily: 'Geist, sans-serif',
} as const
