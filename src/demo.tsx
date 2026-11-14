import DashboardLayout from './dashboard-layout'
import { CheckContent } from './components/astrotwin/check-content'
import { HelpContent } from './components/astrotwin/help-content'
import { CrewContent } from './components/astrotwin/crew-content'
import { RadiationContent } from './components/astrotwin/radiation-content'
import { MissionControlContent, ReportsContent } from './components/astrotwin/reports-content'
import { SettingsContent } from './components/astrotwin/settings-content'
import { SurgeonContent } from './components/astrotwin/surgeon-content'
import { TwinContent } from './components/astrotwin/twin-content'
import {
  DashboardNavigationProvider,
  useDashboardNavigation,
} from './components/bionis/navigation'
import { ThemeProvider } from './components/bionis/theme-provider'
import { LangProvider } from './i18n'
import { MissionProvider } from './state/mission'

function DashboardRoute() {
  const { pathname } = useDashboardNavigation()

  const renderPage = () => {
    switch (pathname) {
      case '/check':
        return <CheckContent />
      case '/twin':
        return <TwinContent />
      case '/surgeon':
        return <SurgeonContent />
      case '/radiation':
        return <RadiationContent />
      case '/reports':
        return <ReportsContent />
      case '/mission-control':
        return <MissionControlContent />
      case '/help':
        return <HelpContent />
      case '/settings':
        return <SettingsContent />
      default:
        return <CrewContent />
    }
  }

  return <DashboardLayout>{renderPage()}</DashboardLayout>
}

export default function AstroTwinApp() {
  return (
    <ThemeProvider storageKey="astrotwin-theme">
      <LangProvider>
        <MissionProvider>
          <DashboardNavigationProvider>
            <DashboardRoute />
          </DashboardNavigationProvider>
        </MissionProvider>
      </LangProvider>
    </ThemeProvider>
  )
}
