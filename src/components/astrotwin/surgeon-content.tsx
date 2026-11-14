import { ExternalLinkIcon } from 'lucide-react'
import {
  AlertDiamondIcon,
  AlertTriangleIcon,
  BlingFilledIcon,
  CheckCircleRegularIcon,
  Sparkles3FilledIcon,
} from '../bionis/icons'
import { cn } from '@/lib/utils'
import { useI18n } from '../../i18n'
import { findingText, HAZARD_NAMES, LEVEL_NAMES, TIER_NAMES } from '../../i18n/findings'
import { useMission } from '../../state/mission'
import { levelText, PageHeader, Pill, SimBadge, SimulatedBadge, SourceBadge, tierLevel } from './ui'
import { useNarration } from './use-narration'

const levelIcon = {
  nominal: CheckCircleRegularIcon,
  watch: AlertTriangleIcon,
  alert: AlertTriangleIcon,
  critical: AlertDiamondIcon,
} as const

export function SurgeonContent() {
  const { t, lang } = useI18n()
  const { current } = useMission()
  const { sbar, source, pending } = useNarration()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('surgeon.title')}
        subtitle={t('surgeon.subtitle')}
        right={
          <Pill level={tierLevel[current.tier]}>
            {current.name} · {TIER_NAMES[lang][current.tier]}
          </Pill>
        }
      />
      <SimBadge />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="flex flex-col gap-5 rounded-2xl border bg-[linear-gradient(180deg,rgb(20_184_166/0.08)_0%,transparent_42%)] p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--insight-actions) text-white">
                <BlingFilledIcon className="size-4" />
              </span>
              <h2 className="font-medium">{t('surgeon.message')}</h2>
            </div>
            <div className="flex items-center gap-2">
              {pending ? <span className="text-xs text-muted-foreground">{t('surgeon.narrating')}</span> : null}
              <SourceBadge source={source} />
            </div>
          </div>
          <p className="text-sm leading-relaxed" aria-live="polite">
            {sbar.crewMessage}
          </p>
          <p className="text-xs text-muted-foreground">
            {source === 'live' ? t('surgeon.byLlm') : t('surgeon.byTemplate')}
          </p>
        </article>

        <article className="flex flex-col gap-4 rounded-2xl border bg-[linear-gradient(180deg,rgb(99_102_241/0.08)_0%,transparent_42%)] p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--insight-prediction) text-white">
              <Sparkles3FilledIcon className="size-4" />
            </span>
            <h2 className="font-medium">{t('surgeon.how')}</h2>
          </div>
          <p className="text-sm font-medium">{t('motto')}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('surgeon.howBody')}</p>
        </article>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium">{t('surgeon.alerts', { count: current.findings.length })}</h2>
          <SimulatedBadge />
        </div>
        {current.findings.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border bg-background p-4">
            <CheckCircleRegularIcon className="size-5 shrink-0 text-(--vital-good)" />
            <p className="text-sm">{t('crew.allNominal')}</p>
          </div>
        ) : null}
        {current.findings.map((f) => {
          const Icon = levelIcon[f.level]
          const text = findingText(f, lang)
          return (
            <article key={f.id} className="flex flex-col gap-4 rounded-2xl border bg-background p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className={cn('size-5 shrink-0', levelText[f.level])} />
                  <h3 className="font-medium">{text.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{HAZARD_NAMES[lang][f.hazard]}</span>
                  <Pill level={f.level} className="px-2.5 text-xs">
                    {LEVEL_NAMES[lang][f.level]}
                  </Pill>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {(
                  [
                    ['surgeon.what', text.what],
                    ['surgeon.why', text.why],
                    ['surgeon.action', text.action],
                  ] as const
                ).map(([key, body]) => (
                  <div key={key} className="flex flex-col gap-1.5 rounded-xl bg-muted px-3 py-2.5">
                    <dt className="text-xs font-medium text-muted-foreground">{t(key)}</dt>
                    <dd className="text-sm leading-relaxed">{body}</dd>
                  </div>
                ))}
              </dl>
              <a
                href={f.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <ExternalLinkIcon className="size-3.5" />
                {t('surgeon.source')}: {f.sourceUrl.replace('https://', '')}
              </a>
            </article>
          )
        })}
      </section>
    </div>
  )
}
