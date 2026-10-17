import { ActionIcon, Badge, Drawer, NavLink, VisuallyHidden } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { type LucideIcon, Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import type { StatusTone } from '@/shared/styles/variantColorResolver'
import classes from './ConsoleShell.module.css'
import { SkipLink } from './SkipLink'

// 판매자 센터·관리자 콘솔 공통 틀.
// 데스크톱(≥ 1024): 상단 바 56 + 왼쪽 사이드바 240(아이콘 + 메뉴 + 대기 개수 배지) + 본문 최대 1280.
// 모바일: 상단 바 56(메뉴 열기 + 화면 제목 h1 + 보조 글) + 메뉴 드로어. 화면의 PageHeader는 hideOnMobile로 둔다.

export type ConsoleNavItem = {
  label: string
  to: string
  icon: LucideIcon
  /** 처리 대기 개수 */
  count?: number
  countTone?: StatusTone
  /** 정확히 같은 경로일 때만 활성 (홈) */
  end?: boolean
}

export type ConsoleShellProps = {
  variant: 'seller' | 'admin'
  /** 로고 옆 배지 문구 (‘판매자 센터’ · ‘관리자 콘솔’) */
  badge: string
  /** 데스크톱 상단 바 오른쪽 */
  topRight?: ReactNode
  /** 메뉴 영역 이름 */
  navLabel: string
  navItems: ConsoleNavItem[]
  /** 모바일 상단 바 제목 (지금 화면) */
  title: string
  /** 모바일 상단 바 오른쪽 작은 글 (상호 등) */
  mobileAside?: ReactNode
  /** 활성 메뉴 판단에 쓰는 경로 (기본: 지금 주소). 갤러리 미리보기용 */
  currentPath?: string
  children: ReactNode
}

function isActive(item: ConsoleNavItem, pathname: string) {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: ConsoleNavItem[]
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <>
      {items.map((item) => {
        const active = isActive(item, pathname)
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            leftSection={<Icon aria-hidden="true" />}
            rightSection={
              item.count ? (
                <Badge color={item.countTone ?? 'neutral'} radius={1000} className="pd-num">
                  {item.count}
                  <VisuallyHidden>건</VisuallyHidden>
                </Badge>
              ) : undefined
            }
            active={active}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
          />
        )
      })}
    </>
  )
}

export function ConsoleShell({
  variant,
  badge,
  topRight,
  navLabel,
  navItems,
  title,
  mobileAside,
  currentPath,
  children,
}: ConsoleShellProps) {
  const location = useLocation()
  const pathname = currentPath ?? location.pathname
  const [drawerOpened, drawer] = useDisclosure(false)

  const brand = (
    <span className={classes.brand}>
      <Link to={variant === 'seller' ? '/seller' : '/admin'} className={`pd-serif ${classes.logo}`}>
        팔도곳간
      </Link>
      <Badge className={classes.badge}>{badge}</Badge>
    </span>
  )

  return (
    <div className={classes.root} data-variant={variant}>
      <SkipLink />

      {/* 데스크톱 상단 바 */}
      <header className={classes.topBar}>
        {brand}
        {topRight && <div className={classes.topRight}>{topRight}</div>}
      </header>

      {/* 모바일 상단 바 */}
      <header className={classes.mobileBar}>
        <ActionIcon
          className={classes.menuButton}
          aria-label="메뉴 열기"
          aria-expanded={drawerOpened}
          onClick={drawer.open}
        >
          <Menu size={24} aria-hidden="true" />
        </ActionIcon>
        <h1 className={classes.mobileTitle}>{title}</h1>
        {mobileAside && <span className={classes.mobileAside}>{mobileAside}</span>}
      </header>

      <div className={classes.body}>
        <nav aria-label={navLabel} className={classes.sidebar}>
          <NavList items={navItems} pathname={pathname} />
        </nav>
        <main id="main" className={classes.main}>
          {children}
        </main>
      </div>

      <Drawer
        opened={drawerOpened}
        onClose={drawer.close}
        title={brand}
        size={280}
        classNames={{ body: classes.drawerBody }}
      >
        <nav aria-label={navLabel} className={classes.drawerNav}>
          <NavList items={navItems} pathname={pathname} onNavigate={drawer.close} />
        </nav>
      </Drawer>
    </div>
  )
}
