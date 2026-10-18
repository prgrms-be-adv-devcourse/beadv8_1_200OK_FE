import { ActionIcon, Button, VisuallyHidden } from '@mantine/core'
import { Heart, House, ShoppingCart, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useCategories } from '@/features/products'
import { MemberRole, type ProductCategory } from '@/shared/api/types'
import { categoryLabels } from '@/shared/lib/labels'
import { useRouteHandle } from '../routeHandle'
import { type Session, useSession } from '../session'
import classes from './PublicLayout.module.css'
import { SkipLink } from './SkipLink'

// B2C 레이아웃. 데스크톱(≥ 1024): 헤더 64(로고 · 내 메뉴) + 카테고리 48. 모바일: 상단 56(홈만) + 하단 탭 56(최상위 화면만).
// 콘텐츠 최대 1200. 헤더 검색창은 검색 API가 생길 때까지 두지 않는다(DECISIONS.md A-9).
// 카테고리는 GET /products/categories 응답으로 그린다(A-1). 받기 전·실패하면 표시명 표로 그린다.

export type CategoryLink = { code: ProductCategory; label: string }

const defaultCategories: CategoryLink[] = Object.entries(categoryLabels).map(([code, label]) => ({
  code: code as ProductCategory,
  label,
}))

export type PublicLayoutViewProps = {
  session: Session
  /** 장바구니에 담긴 상품 수 */
  cartCount?: number
  categories?: CategoryLink[]
  /** 모바일 상단 로고 바 */
  showMobileHeader?: boolean
  /** 모바일 하단 탭 */
  showTabBar?: boolean
  /** 활성 메뉴 판단에 쓰는 경로 (기본: 지금 주소). 갤러리 미리보기용 */
  currentPath?: string
  children: ReactNode
}

const tabs = [
  { label: '홈', to: '/', icon: House },
  { label: '관심', to: '/me/likes', icon: Heart },
  { label: '장바구니', to: '/cart', icon: ShoppingCart },
  { label: '마이', to: '/me', icon: User },
]

const under = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`)

// 시안: 상품 목록은 ‘홈’, 주문·지갑·계정은 ‘마이’ 탭이 켜진다
function isTabActive(to: string, pathname: string) {
  switch (to) {
    case '/':
      return pathname === '/' || under(pathname, '/products')
    case '/me':
      return (under(pathname, '/me') && !under(pathname, '/me/likes')) || under(pathname, '/orders')
    default:
      return under(pathname, to)
  }
}

function CartCount({ count }: { count?: number }) {
  if (!count) return null
  return (
    <>
      <span className={classes.count} aria-hidden="true">
        {count > 99 ? '99+' : count}
      </span>
      <VisuallyHidden> {count}개 담김</VisuallyHidden>
    </>
  )
}

export function PublicLayoutView({
  session,
  cartCount,
  categories = defaultCategories,
  showMobileHeader = false,
  showTabBar = false,
  currentPath,
  children,
}: PublicLayoutViewProps) {
  const location = useLocation()
  const path = currentPath ?? `${location.pathname}${location.search}`
  const url = new URL(path, 'http://local')
  const onProducts = url.pathname === '/products'
  const activeCategory = onProducts ? url.searchParams.get('category') : undefined

  const loggedIn = session.status === 'authenticated'
  const isSeller = loggedIn && session.role === MemberRole.SELLER

  return (
    <div className={classes.root} data-tab-bar={showTabBar || undefined}>
      <SkipLink />

      {/* ─── 데스크톱 헤더 ─── */}
      <header className={classes.desktopHeader}>
        <div className={classes.headerBar}>
          <Link to="/" className={`pd-serif ${classes.logo}`}>
            팔도곳간
          </Link>
          <nav aria-label="내 메뉴" className={classes.myMenu}>
            {isSeller && (
              <Button component={Link} to="/seller" variant="subtle">
                판매자 센터
              </Button>
            )}
            <Link to="/me/likes" className={classes.headerLink}>
              <Heart aria-hidden="true" />
              관심
            </Link>
            <Link to="/cart" className={classes.headerLink}>
              <span className={classes.iconWithCount}>
                <ShoppingCart aria-hidden="true" />
                <CartCount count={cartCount} />
              </span>
              장바구니
            </Link>
            {loggedIn ? (
              <Link to="/me" className={classes.headerLink}>
                <User aria-hidden="true" />
                마이
              </Link>
            ) : (
              <Link to="/login" className={classes.headerLink}>
                <User aria-hidden="true" />
                로그인
              </Link>
            )}
          </nav>
        </div>
        <nav aria-label="카테고리" className={classes.categories}>
          <Link
            to="/products"
            className={classes.category}
            aria-current={onProducts && !activeCategory ? 'page' : undefined}
          >
            전체
          </Link>
          {categories.map((category) => (
            <Link
              key={category.code}
              to={`/products?category=${category.code}`}
              className={classes.category}
              aria-current={activeCategory === category.code ? 'page' : undefined}
            >
              {category.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* ─── 모바일 상단 로고 바 (홈) ─── */}
      {showMobileHeader && (
        <header className={classes.mobileHeader}>
          <Link to="/" className={`pd-serif ${classes.mobileLogo}`}>
            팔도곳간
          </Link>
          <ActionIcon component={Link} to="/cart" aria-label="장바구니">
            <span className={classes.iconWithCount}>
              <ShoppingCart aria-hidden="true" />
              <CartCount count={cartCount} />
            </span>
          </ActionIcon>
        </header>
      )}

      <main id="main" className={classes.main}>
        {children}
      </main>

      {/* ─── 모바일 하단 탭 ─── */}
      {showTabBar && (
        <nav aria-label="하단 메뉴" className={classes.tabBar}>
          {tabs.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={classes.tab}
              aria-current={isTabActive(to, url.pathname) ? 'page' : undefined}
            >
              <Icon size={24} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}

/** 라우트용: 세션과 화면 정보(handle)로 View를 채운다 */
export function PublicLayout() {
  const session = useSession()
  const handle = useRouteHandle()
  const { data: categories } = useCategories()
  // TODO(api): 장바구니 개수는 2단계에서 장바구니 조회로 채운다
  return (
    <PublicLayoutView
      session={session}
      categories={categories}
      showMobileHeader={handle.mobileHeader}
      showTabBar={handle.tabBar}
    >
      <Outlet />
    </PublicLayoutView>
  )
}
