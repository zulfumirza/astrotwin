import {
  BookOpenIcon,
  CreditCardIcon,
  LogOutIcon,
  MessageCircleIcon,
  SettingsIcon,
  UserIcon as LucideUserIcon,
} from 'lucide-react'
import {
  QuestionIcon,
  SidebarCollapseIcon,
  ToggleIcon,
  UserIcon,
} from './icons'
import { AstroTwinWordmark, BionisLogo } from './logo'
import { DashboardLink, useDashboardNavigation } from './navigation'
import { useTheme } from './theme-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { navGroups, type NavItem as NavItemType } from '../astrotwin/nav'
import { useI18n } from '../../i18n'
import { useMission } from '../../state/mission'
import { cn } from '@/lib/utils'

const menuButtonClassName = cn(
  'h-12 gap-2.5 rounded-xl border border-transparent px-3 text-base tracking-tight text-muted-foreground transition-colors',
  'aria-[current=page]:border-border aria-[current=page]:bg-background aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground aria-[current=page]:shadow-[1px_2px_12px_rgba(158,158,158,0.08)]',
  'dark:aria-[current=page]:border-transparent dark:aria-[current=page]:bg-sidebar-accent dark:aria-[current=page]:shadow-[1px_2px_12px_rgba(0,0,0,0.25)]',
  'hover:bg-sidebar-accent data-open:bg-background data-open:text-sidebar-accent-foreground dark:data-open:bg-sidebar-accent',
  '[&_svg]:size-5!',
  'group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span]:hidden',
)

function NavItem({ item }: { item: NavItemType }) {
  const { t } = useI18n()
  const { reports } = useMission()
  const { isMobile, setOpenMobile } = useSidebar()
  const { pathname } = useDashboardNavigation()
  const isActive =
    item.href === '/'
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  const badge = item.href === '/mission-control' ? reports.length : 0

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={t(item.key)}
      className={menuButtonClassName}
    >
      <DashboardLink
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        data-tour={item.href === '/help' ? 'help' : undefined}
        onClick={() => {
          if (isMobile) setOpenMobile(false)
        }}
      >
        <item.icon />
        <span>{t(item.key)}</span>
        {badge ? (
          <SidebarMenuBadge className="sidebar-badge-shadow static ml-auto rounded bg-background px-2 py-1.5 text-sm text-muted-foreground group-aria-[current=page]/menu-button:font-medium group-aria-[current=page]/menu-button:text-sidebar-accent-foreground">
            {badge}
          </SidebarMenuBadge>
        ) : null}
      </DashboardLink>
    </SidebarMenuButton>
  )
}

function HelpItem() {
  const { t } = useI18n()
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton className={menuButtonClassName}>
            <QuestionIcon />
            <span>{t('side.sources')}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          className="bionis-dashboard w-64"
        >
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium text-foreground">{t('side.sourcesTitle')}</p>
            <p>{t('side.sourcesSub')}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <a href="https://www.nasa.gov/hrp/hazards/" target="_blank" rel="noreferrer">
                <BookOpenIcon />
                NASA HRP — 5 Hazards
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="https://www.nasa.gov/hrp/risks/" target="_blank" rel="noreferrer">
                <BookOpenIcon />
                NASA HRP — Risks
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href="https://kauai.ccmc.gsfc.nasa.gov/DONKI/"
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircleIcon />
                NASA DONKI
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function DarkModeItem() {
  const { t } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const label = isDark ? t('side.light') : t('side.dark')

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={label}
        className={menuButtonClassName}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
      >
        <ToggleIcon pressed={isDark} />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function ProfileItem() {
  const { t, lang } = useI18n()
  const { current, mission, setScenario } = useMission()
  const { navigate } = useDashboardNavigation()
  const { isMobile, setOpenMobile } = useSidebar()
  const role = mission.crew.find((c) => c.id === current.crewId)?.role[lang]

  const go = (path: string) => {
    navigate(path)
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip={t('side.profile')} className={menuButtonClassName}>
            <UserIcon />
            <span>{t('side.profile')}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          className="bionis-dashboard w-56"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="leading-tight">
              <p className="text-sm font-medium text-foreground">
                {current.name}
              </p>
              <p>{role} · {t('sim.short')}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => go('/check')}>
              <LucideUserIcon />
              {t('nav.check')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => go('/settings')}>
              <SettingsIcon />
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => go('/reports')}>
              <CreditCardIcon />
              {t('nav.reports')}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setScenario('hidden')
              go('/')
            }}
          >
            <LogOutIcon />
            {t('side.reset')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function CollapseControl({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const { t } = useI18n()
  if (!collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex size-9.5 shrink-0 items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors"
        aria-label={t('side.collapse')}
      >
        <SidebarCollapseIcon className="-rotate-90" />
      </button>
    )
  }

  return (
    <div className="relative size-11 shrink-0">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center transition-all ease-linear group-hover:scale-75 group-hover:opacity-0 group-focus-within:scale-75 group-focus-within:opacity-0">
        <BionisLogo className="size-7" />
      </div>
      <div className="pointer-events-none absolute inset-0 flex scale-75 items-center justify-center opacity-0 transition-all ease-linear group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onToggle}
          className="flex size-11 items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors"
          aria-label={t('side.expand')}
        >
          <SidebarCollapseIcon className="rotate-90" />
        </button>
      </div>
    </div>
  )
}

export function DashboardSidebar() {
  const { t } = useI18n()
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === 'collapsed'

  return (
    <Sidebar collapsible="icon" className="h-full border-none">
      <SidebarHeader
        className={cn(
          'h-16 flex-row items-center border-b border-sidebar-border transition-[padding] md:h-20',
          collapsed ? 'justify-start px-3' : 'justify-between gap-4.75 px-4',
        )}
      >
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <BionisLogo className="size-7 shrink-0" />
            <AstroTwinWordmark className="truncate text-xl" />
          </div>
        )}
        <CollapseControl collapsed={collapsed} onToggle={toggleSidebar} />
      </SidebarHeader>

      <SidebarContent className="gap-4 overflow-x-hidden overflow-y-auto px-3 py-4 group-data-[collapsible=icon]:overflow-y-auto!">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="gap-2 p-0">
            <SidebarGroupLabel className="h-auto px-3 py-1 text-base font-normal tracking-tight text-muted-foreground">
              {t(group.label)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <NavItem item={item} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-6 border-t border-sidebar-border px-3 py-3">
        <SidebarMenu className="gap-2">
          <HelpItem />
          <DarkModeItem />
          <ProfileItem />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
