import { useEffect, useRef, useState } from 'react'
import { DatabaseIcon } from 'lucide-react'
import {
  AlertDiamondIcon,
  AlertTriangleIcon,
  BellIcon,
  CheckCircleRegularIcon,
  CloseIcon,
  SearchIcon,
} from './icons'
import { DashboardLink, useDashboardNavigation } from './navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { navGroups } from '../astrotwin/nav'
import { formatDelay, type Level } from '../../engine'
import { useI18n } from '../../i18n'
import { findingText, TIER_NAMES } from '../../i18n/findings'
import { useMission } from '../../state/mission'
import { cn } from '@/lib/utils'

const levelIcons = {
  nominal: CheckCircleRegularIcon,
  watch: AlertTriangleIcon,
  alert: AlertTriangleIcon,
  critical: AlertDiamondIcon,
} as const

const levelToneClass: Record<Level, { icon: string; bg: string }> = {
  nominal: {
    icon: '!text-(--vital-good) [&_*]:!text-(--vital-good)',
    bg: 'bg-(--vital-good)/10',
  },
  watch: {
    icon: '!text-(--prediction-warn) [&_*]:!text-(--prediction-warn)',
    bg: 'bg-(--chart-warn-bg)',
  },
  alert: {
    icon: '!text-(--prediction-warn) [&_*]:!text-(--prediction-warn)',
    bg: 'bg-(--chart-warn-bg)',
  },
  critical: {
    icon: '!text-(--prediction-danger) [&_*]:!text-(--prediction-danger)',
    bg: 'bg-(--prediction-danger)/10',
  },
}

const tierText = {
  routine: 'text-(--live)',
  anomaly: 'text-(--chart-warn)',
  critical: 'text-(--prediction-danger)',
} as const

const avatar = (initials: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88"><rect width="88" height="88" rx="16" fill="#E0F2FE"/><text x="44" y="54" text-anchor="middle" font-family="Geist, sans-serif" font-size="30" font-weight="600" fill="#00509B">${initials}</text></svg>`,
  )}`
const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)

function useCurrentNavItem() {
  const { pathname } = useDashboardNavigation()
  const items = navGroups.flatMap((group) => group.items)
  return items.find((item) => item.href === pathname) ?? items[0]
}

export function DashboardTopbar() {
  const { t, lang, setLang } = useI18n()
  const { navigate } = useDashboardNavigation()
  const { current, assessments, mission, setSelectedId, delaySec } = useMission()
  const currentNavItem = useCurrentNavItem()
  const PageIcon = currentNavItem.icon
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)
  const role = (id: string) => mission.crew.find((c) => c.id === id)?.role[lang] ?? ''

  // Search jumps to a screen by name (Enter).
  const submitSearch = () => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return
    const hit = navGroups
      .flatMap((g) => g.items)
      .find((item) => t(item.key).toLowerCase().includes(q))
    if (hit) {
      navigate(hit.href)
      setSearchQuery('')
      setIsMobileSearchOpen(false)
    }
  }

  const openMobileSearch = () => {
    setIsMobileSearchOpen(true)
    requestAnimationFrame(() => {
      mobileSearchInputRef.current?.focus()
    })
  }

  const closeMobileSearch = () => {
    setIsMobileSearchOpen(false)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()

        if (window.matchMedia('(width < 48rem)').matches) {
          setIsMobileSearchOpen(true)
          requestAnimationFrame(() => {
            mobileSearchInputRef.current?.focus()
          })
          return
        }

        searchInputRef.current?.focus()
      }

      if (event.key === 'Escape') {
        setIsMobileSearchOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const unread = current.findings.filter((f) => f.level !== 'watch').length

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b py-4 px-4 md:h-20 md:pr-8 md:pl-6">
      {isMobileSearchOpen ? (
        <div className="flex w-full items-center gap-2 md:hidden">
          <InputGroup className="h-11 flex-1 border-none bg-secondary py-1 pr-2 pl-3">
            <InputGroupAddon className="pl-0 text-muted-foreground">
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              ref={mobileSearchInputRef}
              className="h-full px-1.5! text-sm tracking-tight placeholder:text-muted-foreground"
              aria-label={t('top.search')}
              placeholder={t('top.searchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitSearch()
              }}
            />
          </InputGroup>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-11 shrink-0"
            aria-label={t('top.searchClose')}
            onClick={closeMobileSearch}
          >
            <CloseIcon />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SidebarTrigger className="size-11 shrink-0 md:hidden [&_svg]:size-5!" />
            <div className="flex min-w-0 items-center gap-3">
              <PageIcon className="hidden size-5 shrink-0 md:block" />
              <p className="truncate text-lg font-medium">
                {t(currentNavItem.key)}
              </p>
              <span
                className="hidden shrink-0 items-center rounded-xl bg-(--chart-period-bg) px-3 py-1 text-sm font-medium text-(--chart-period) lg:inline-flex"
                title={t('top.delayTitle')}
              >
                {t('top.delay', { delay: formatDelay(delaySec) })}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <InputGroup className="hidden h-11 w-56 max-w-full border-none bg-secondary py-1 pr-2 pl-3 xl:flex">
              <InputGroupAddon className="pl-0 text-muted-foreground">
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                ref={searchInputRef}
                className="h-full px-1.5! text-sm tracking-tight placeholder:text-muted-foreground"
                aria-label={t('top.search')}
                placeholder={t('top.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitSearch()
                }}
              />
            </InputGroup>

            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="size-11 rounded-lg xl:hidden"
              aria-label={t('top.searchOpen')}
              onClick={openMobileSearch}
            >
              <SearchIcon className="size-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="size-11"
              aria-label={t('nav.sources')}
              title={t('nav.sources')}
              onClick={() => navigate('/sources')}
            >
              <DatabaseIcon className="size-5" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="size-11 text-sm font-medium"
              aria-label={t('top.lang')}
              data-tour="lang"
              onClick={() => setLang(lang === 'en' ? 'tr' : 'en')}
            >
              {lang === 'en' ? 'TR' : 'EN'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  className="relative size-11"
                  aria-label={t('top.alerts', { count: current.findings.length })}
                >
                  <BellIcon className="size-6!" />
                  {unread > 0 ? (
                    <svg
                      aria-hidden
                      viewBox="0 0 10 10"
                      className="pointer-events-none absolute top-2 right-2 size-2.5 overflow-visible"
                    >
                      <circle cx="5" cy="5" r="5" className="fill-background" />
                      <circle
                        cx="5"
                        cy="5"
                        r="2.75"
                        fill="none"
                        className="stroke-destructive"
                        strokeWidth="2"
                      />
                    </svg>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bionis-dashboard ml-3 w-80 p-0"
              >
                <div className="flex items-center justify-between gap-3 border-b px-3.5 py-3">
                  <p className="text-sm font-medium">{current.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('top.alertsCount', { count: current.findings.length })}
                  </p>
                </div>

                <div className="p-1.5">
                  {current.findings.length === 0 ? (
                    <p className="px-2.5 py-2.5 text-sm text-muted-foreground">{t('crew.onTrajectory')}</p>
                  ) : null}
                  {current.findings.slice(0, 3).map((finding) => {
                    const Icon = levelIcons[finding.level]
                    const tone = levelToneClass[finding.level]
                    const text = findingText(finding, lang)

                    return (
                      <DropdownMenuItem
                        key={finding.id}
                        onSelect={() => navigate('/surgeon')}
                        className="cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2.5 [&_svg]:!text-inherit"
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                            tone.bg,
                            tone.icon,
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-medium leading-snug">
                            {text.title}
                          </p>
                          <p className="truncate text-xs leading-relaxed text-muted-foreground">
                            {text.what}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                </div>

                <div className="border-t px-3.5 py-2.5 text-center">
                  <DashboardLink
                    href="/surgeon"
                    className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {t('top.viewAll')}
                  </DashboardLink>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto gap-2 px-0 aria-expanded:bg-transparent hover:bg-transparent"
                  aria-label={t('top.crewSelect', { name: current.name })}
                >
                  <img
                    src={avatar(initialsOf(current.name))}
                    alt=""
                    className="size-11 rounded-lg bg-muted object-cover"
                  />
                  <div className="hidden flex-col items-start gap-1 text-left md:flex">
                    <span className="text-base font-medium leading-none">
                      {current.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm leading-none text-muted-foreground">
                      {role(current.crewId)}
                      <span
                        aria-hidden
                        className="block size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                      />
                      <span className={tierText[current.tier]}>
                        {TIER_NAMES[lang][current.tier]}
                      </span>
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bionis-dashboard w-72 p-1.5"
              >
                <p className="px-2.5 py-2 text-xs text-muted-foreground">{t('top.crewHint')}</p>
                {assessments.map((a) => (
                  <DropdownMenuItem
                    key={a.crewId}
                    onSelect={() => setSelectedId(a.crewId)}
                    className={cn(
                      'cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5',
                      a.crewId === current.crewId && 'bg-muted',
                    )}
                  >
                    <img src={avatar(initialsOf(a.name))} alt="" className="size-9 rounded-lg bg-muted object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{role(a.crewId)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium leading-none tabular-nums">{a.score}</p>
                      <p className={cn('text-xs', tierText[a.tier])}>{TIER_NAMES[lang][a.tier]}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </header>
  )
}
