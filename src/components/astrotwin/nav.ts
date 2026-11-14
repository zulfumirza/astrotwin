import type { ComponentType, SVGProps } from 'react'
import {
  ActivityIcon,
  BellIcon,
  GearIcon,
  HomeIcon,
  PredictionIcon,
  RecoveryIcon,
  ReportsIcon,
  QuestionIcon,
  TrendsIcon,
} from '../bionis/icons'
import type { UiKey } from '../../i18n/ui'

export interface NavItem {
  key: UiKey
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

// Design screen → AstroTwin function mapping (see README).
export const navGroups: Array<{ label: UiKey; items: NavItem[] }> = [
  {
    label: 'nav.group.onboard',
    items: [
      { key: 'nav.crew', href: '/', icon: HomeIcon },
      { key: 'nav.check', href: '/check', icon: ActivityIcon },
      { key: 'nav.twin', href: '/twin', icon: TrendsIcon },
      { key: 'nav.surgeon', href: '/surgeon', icon: PredictionIcon },
    ],
  },
  {
    label: 'nav.group.hazards',
    items: [{ key: 'nav.radiation', href: '/radiation', icon: RecoveryIcon }],
  },
  {
    label: 'nav.group.earth',
    items: [
      { key: 'nav.reports', href: '/reports', icon: ReportsIcon },
      { key: 'nav.mc', href: '/mission-control', icon: BellIcon },
      { key: 'nav.settings', href: '/settings', icon: GearIcon },
      { key: 'nav.help', href: '/help', icon: QuestionIcon },
    ],
  },
]
