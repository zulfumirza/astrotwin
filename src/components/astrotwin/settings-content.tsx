import { ExternalLinkIcon } from 'lucide-react'
import { useTheme } from '../bionis/theme-provider'
import { Button } from '@/components/ui/button'
import { formatDelay, type Lang, type MissionProfileId } from '../../engine'
import { useI18n } from '../../i18n'
import { useMission } from '../../state/mission'
import { PageHeader, SourceBadge, Toggle } from './ui'

export const SOURCE_LINKS = [
  { label: 'NASA HRP — 5 Hazards of Human Spaceflight', href: 'https://www.nasa.gov/hrp/hazards/' },
  { label: 'NASA HRP — Risks of Human Spaceflight', href: 'https://www.nasa.gov/hrp/risks/' },
  { label: 'NASA HRP — Ongoing Research', href: 'https://www.nasa.gov/hrp/ongoing-hrp-research/' },
  {
    label: 'CSA — Monitoring Radiation for Astronaut Health',
    href: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp',
  },
  { label: 'NASA DONKI', href: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/' },
  { label: 'NOAA SWPC — GOES proton flux', href: 'https://www.swpc.noaa.gov/products/goes-proton-flux' },
  { label: 'JPL Horizons', href: 'https://ssd.jpl.nasa.gov/horizons/' },
]

const PROFILES: MissionProfileId[] = ['leo', 'moon', 'mars']

export function SettingsContent() {
  const { t, lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()
  const { profile, setProfile, delaySec, marsRange, privacy, setPrivacy, protons, recentEvents, gleEvents } = useMission()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="flex flex-col gap-5 rounded-2xl border bg-background p-5">
          <h2 className="text-lg font-medium">{t('settings.language')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['en', 'tr'] as Lang[]).map((option) => (
              <Button
                key={option}
                type="button"
                variant={lang === option ? 'default' : 'outline'}
                aria-pressed={lang === option}
                onClick={() => setLang(option)}
              >
                {option === 'en' ? 'English' : 'Türkçe'}
              </Button>
            ))}
          </div>

          <h2 className="text-lg font-medium">{t('settings.appearance')}</h2>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={theme === option ? 'default' : 'outline'}
                aria-pressed={theme === option}
                onClick={() => setTheme(option)}
              >
                {t(`theme.${option}`)}
              </Button>
            ))}
          </div>
        </article>

        <article className="flex flex-col gap-5 rounded-2xl border bg-background p-5">
          <h2 className="text-lg font-medium">{t('settings.profile')}</h2>
          <div className="grid grid-cols-3 gap-3">
            {PROFILES.map((option) => (
              <Button
                key={option}
                type="button"
                variant={profile === option ? 'default' : 'outline'}
                aria-pressed={profile === option}
                onClick={() => setProfile(option)}
              >
                {t(`profile.${option}`)}
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
            <div>
              <p className="text-sm font-medium">{t('mc.oneWay')}</p>
              <p className="text-xs text-muted-foreground">
                {profile === 'mars' ? t('settings.marsLive', { au: marsRange.data.au.toFixed(3) }) : t('mc.distanceFixed')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium tabular-nums">{formatDelay(delaySec)}</span>
              {profile === 'mars' ? <SourceBadge source={marsRange.source} at={marsRange.fetchedAt} /> : null}
            </div>
          </div>

          <h2 className="text-lg font-medium">{t('privacy.title')}</h2>
          <Toggle
            checked={privacy.shareBehavioral}
            onChange={(v) => setPrivacy({ shareBehavioral: v })}
            label={t('privacy.toggle')}
            description={t('privacy.toggleSub')}
          />
        </article>

        <article className="flex flex-col gap-4 rounded-2xl border bg-background p-5">
          <h2 className="text-lg font-medium">{t('settings.data')}</h2>
          {(
            [
              ['NOAA SWPC GOES', protons],
              ['NASA DONKI (30 d)', recentEvents],
              ['NASA DONKI (GLE74)', gleEvents],
              ['JPL Horizons', marsRange],
            ] as const
          ).map(([name, s]) => (
            <div key={name} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
              <span className="text-sm font-medium">{name}</span>
              {s ? <SourceBadge source={s.source} at={s.fetchedAt} /> : <span className="text-xs text-muted-foreground">{t('loading')}</span>}
            </div>
          ))}
          <p className="text-sm font-medium">{t('motto')}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.disclaimer')}</p>
        </article>

        <article className="flex flex-col gap-4 rounded-2xl border bg-background p-5">
          <h2 className="text-lg font-medium">{t('settings.sources')}</h2>
          <ul className="flex flex-col gap-2">
            {SOURCE_LINKS.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
                >
                  <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.doseModels')}</p>
        </article>
      </div>
    </div>
  )
}
