import { CompassIcon, ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '../../i18n'
import { ht, type HelpKey } from '../../i18n/help'
import { useDashboardNavigation } from '../bionis/navigation'
import { navGroups } from './nav'
import { SOURCE_LINKS } from './settings-content'
import { PageHeader } from './ui'

const SCREEN_TEXT: Record<string, HelpKey> = {
  '/': 'screen.crew',
  '/check': 'screen.check',
  '/twin': 'screen.twin',
  '/surgeon': 'screen.surgeon',
  '/radiation': 'screen.radiation',
  '/reports': 'screen.reports',
  '/mission-control': 'screen.mc',
  '/settings': 'screen.settings',
}

export function HelpContent() {
  const { t, lang } = useI18n()
  const { navigate } = useDashboardNavigation()
  const screens = navGroups.flatMap((g) => g.items).filter((i) => SCREEN_TEXT[i.href])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={ht(lang, 'pageTitle')}
        subtitle={ht(lang, 'pageSub')}
        right={
          <Button type="button" onClick={() => window.dispatchEvent(new Event('astrotwin:tour-start'))}>
            <CompassIcon />
            {ht(lang, 'restart')}
          </Button>
        }
      />

      <section className="flex flex-col gap-3 rounded-2xl border bg-[linear-gradient(180deg,rgb(99_102_241/0.08)_0%,transparent_42%)] p-5">
        <h2 className="text-lg font-medium">{ht(lang, 'quickTitle')}</h2>
        <ol className="flex flex-col gap-2">
          {(['quick1', 'quick2', 'quick3'] as HelpKey[]).map((k, i) => (
            <li key={k} className="flex items-start gap-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-(--bionis-blue) text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5">{ht(lang, k)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{ht(lang, 'screensTitle')}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {screens.map((s) => (
            <article key={s.href} className="flex flex-col justify-between gap-3 rounded-2xl border bg-background p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--chart-period-bg) text-(--chart-period)">
                    <s.icon className="size-4" />
                  </span>
                  <h3 className="font-medium">{t(s.key)}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{ht(lang, SCREEN_TEXT[s.href])}</p>
              </div>
              <Button type="button" variant="outline" className="w-fit" onClick={() => navigate(s.href)}>
                {ht(lang, 'open')}
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="flex flex-col gap-3 rounded-2xl border bg-background p-5">
          <h2 className="text-lg font-medium">{ht(lang, 'glossaryTitle')}</h2>
          <ul className="flex flex-col gap-2">
            {(['g.sans', 'g.sbar', 'g.pvt', 'g.logmar', 'g.sep', 'g.tier', 'g.baseline'] as HelpKey[]).map((k) => {
              const [term, ...rest] = ht(lang, k).split(' — ')
              return (
                <li key={k} className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
                  <span className="font-medium">{term}</span>
                  <span className="text-muted-foreground"> — {rest.join(' — ')}</span>
                </li>
              )
            })}
          </ul>
        </article>

        <article className="flex flex-col gap-3 rounded-2xl border bg-background p-5">
          <h2 className="text-lg font-medium">{ht(lang, 'faqTitle')}</h2>
          {([1, 2, 3, 4] as const).map((n) => (
            <details key={n} className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium">{ht(lang, `faq.q${n}` as HelpKey)}</summary>
              <p className="mt-2 leading-relaxed text-muted-foreground">{ht(lang, `faq.a${n}` as HelpKey)}</p>
            </details>
          ))}
          <h2 className="mt-2 text-lg font-medium">{ht(lang, 'keysTitle')}</h2>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {(['key.search', 'key.tab', 'key.arrows', 'key.esc'] as HelpKey[]).map((k) => (
              <li key={k}>{ht(lang, k)}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-background p-5">
        <h2 className="text-lg font-medium">{t('settings.sources')}</h2>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {SOURCE_LINKS.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline">
                <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
