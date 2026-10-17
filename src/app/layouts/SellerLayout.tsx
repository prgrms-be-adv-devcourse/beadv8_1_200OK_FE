import { Button, Text } from '@mantine/core'
import {
  Banknote,
  ExternalLink,
  House,
  Package,
  RotateCcw,
  Store,
  Truck,
  User,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { useRouteHandle } from '../routeHandle'
import { type ConsoleNavItem, ConsoleShell } from './ConsoleShell'

// 판매자 센터 레이아웃. 시안: seller/SellerHome, SellerHomeMobile
// 메뉴 순서·이름은 시안 사이드바를 따른다. 대기 개수: 주문·출고(보통), 취소 요청(주의)

export type SellerLayoutViewProps = {
  title: string
  storeName?: string
  userName?: string
  /** 출고 대기 수 */
  pendingOrders?: number
  /** 처리 안 한 취소 요청 수 */
  pendingClaims?: number
  currentPath?: string
  children: ReactNode
}

export function SellerLayoutView({
  title,
  storeName,
  userName,
  pendingOrders,
  pendingClaims,
  currentPath,
  children,
}: SellerLayoutViewProps) {
  const navItems: ConsoleNavItem[] = [
    { label: '센터 홈', to: '/seller', icon: House, end: true },
    { label: '상품 관리', to: '/seller/products', icon: Package },
    { label: '주문·출고', to: '/seller/orders', icon: Truck, count: pendingOrders },
    {
      label: '취소 요청',
      to: '/seller/claims',
      icon: RotateCcw,
      count: pendingClaims,
      countTone: 'warning',
    },
    { label: '정산 내역', to: '/seller/payouts', icon: Wallet },
    { label: '지갑·출금', to: '/seller/wallet', icon: Banknote },
    { label: '상점 프로필', to: '/seller/profile', icon: Store },
  ]

  return (
    <ConsoleShell
      variant="seller"
      badge="판매자 센터"
      navLabel="판매자 센터 메뉴"
      navItems={navItems}
      title={title}
      mobileAside={storeName}
      currentPath={currentPath}
      topRight={
        <>
          {storeName && (
            <Text component="strong" fw={600} me="xs">
              {storeName}
            </Text>
          )}
          <Button
            component={Link}
            to="/"
            variant="subtle"
            size="sm"
            rightSection={<ExternalLink size={16} aria-hidden="true" />}
          >
            구매자 화면 가기
          </Button>
          {userName && (
            <Button
              component={Link}
              to="/me"
              variant="subtle"
              c="var(--pd-color-text)"
              leftSection={<User size={20} aria-hidden="true" />}
            >
              {userName}
            </Button>
          )}
        </>
      }
    >
      {children}
    </ConsoleShell>
  )
}

export function SellerLayout() {
  const handle = useRouteHandle()
  // TODO(api): 상호·이름·대기 개수는 2단계에서 판매자 정보·주문 API로 채운다
  return (
    <SellerLayoutView title={handle.title ?? '판매자 센터'}>
      <Outlet />
    </SellerLayoutView>
  )
}
