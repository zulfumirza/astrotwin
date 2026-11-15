import type { CSSProperties, ReactNode } from 'react'
import { DashboardSidebar } from './components/bionis/sidebar'
import { DashboardTopbar } from './components/bionis/topbar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useI18n } from './i18n'
import { CrisisCard } from './components/astrotwin/crisis-card'
import { GuidedTour } from './components/astrotwin/tour'
import { ScreenErrorBoundary } from './components/astrotwin/error-boundary'
import { DashboardLink, useDashboardNavigation } from './components/bionis/navigation'
import './dashboard.css'

type DashboardLayoutProps = {
  children: ReactNode
}

const FOOTER_LINKS = [
  { label: 'NASA HRP 5 Hazards', href: 'https://www.nasa.gov/hrp/hazards/' },
  { label: 'HRP Risks', href: 'https://www.nasa.gov/hrp/risks/' },
  { label: 'HRP Research', href: 'https://www.nasa.gov/hrp/ongoing-hrp-research/' },
  {
    label: 'CSA Radiation',
    href: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp',
  },
  { label: 'NASA DONKI', href: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/' },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { t } = useI18n()
  const { pathname } = useDashboardNavigation()
  return (
    <SidebarProvider
      defaultOpen
      className="bionis-dashboard h-svh overflow-hidden no-scrollbar"
      style={
        {
          '--sidebar-width': '18.125rem',
          '--sidebar-width-icon': '4.25rem',
        } as CSSProperties
      }
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        {t('skip')}
      </a>
      <DashboardSidebar />
      <GuidedTour />

      <main className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar />
        <div id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto px-4 py-6 outline-none md:px-8 md:py-10">
          {/* Crisis mode: shown above every onboard screen; Mission Control is Earth's view. */}
          {pathname !== '/mission-control' ? <CrisisCard /> : null}
          <ScreenErrorBoundary resetKey={pathname} title={t('error.title')} body={t('error.body')} retry={t('error.retry')}>
            {children}
          </ScreenErrorBoundary>
          <footer className="mt-10 flex flex-col gap-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
            <p className="text-sm text-foreground">
              {t('footer.builtBy')}{' '}
              <span className="font-medium">Zülfü Mirza Gür</span> (
              <a href="https://zulfumirza.com" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-muted-foreground">
                zulfumirza.com
              </a>
              ) · <span className="font-medium">TheAstro</span> (
              <a href="https://theastro.us" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-muted-foreground">
                theastro.us
              </a>
              ) · NASA Space Apps Challenge 2026
            </p>
            <p>{t('footer.disclaimer')}</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              <DashboardLink href="/sources" className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground">
                {t('nav.sources')}
              </DashboardLink>
              <span>·</span>
              <span>{t('footer.sources')}:</span>
              {FOOTER_LINKS.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-foreground hover:underline">
                  {l.label}
                </a>
              ))}
            </p>
          </footer>
        </div>
      </main>
    </SidebarProvider>
  )
}
