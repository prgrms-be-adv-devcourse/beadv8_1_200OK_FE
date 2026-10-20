import { Group } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, User, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { usePendingSellerApplicationCount } from '@/features/admin'
import { myInfoQueryOptions } from '@/shared/api/memberInfo'
import { useRouteHandle } from '../routeHandle'
import { type ConsoleNavItem, ConsoleShell } from './ConsoleShell'

// 운영 관리자 콘솔 레이아웃(제안, DECISIONS.md B-2). 어두운 상단 바 + ‘관리자 콘솔’ 배지 + 사이드바.
// 시안: admin/AdminSellers, AdminSettlements
// 심사 대기 수는 ✅ GET /admin/seller-applications?status=PENDING&size=1의 totalElements (features/admin 훅, 같은 청크).

export type AdminLayoutViewProps = {
  title: string
  adminName?: string
  /** 심사 대기 수 */
  pendingSellers?: number
  currentPath?: string
  children: ReactNode
}

export function AdminLayoutView({
  title,
  adminName,
  pendingSellers,
  currentPath,
  children,
}: AdminLayoutViewProps) {
  const navItems: ConsoleNavItem[] = [
    {
      label: '판매자 심사',
      to: '/admin/sellers',
      icon: BadgeCheck,
      count: pendingSellers,
      countTone: 'warning',
    },
    { label: '정산 관리', to: '/admin/payouts', icon: Wallet },
  ]

  return (
    <ConsoleShell
      variant="admin"
      badge="관리자 콘솔"
      navLabel="관리자 메뉴"
      navItems={navItems}
      title={title}
      drawerHelp={adminName}
      currentPath={currentPath}
      topRight={
        adminName && (
          <Group gap="xs" fz="sm">
            <User size={20} aria-hidden="true" />
            {adminName}
          </Group>
        )
      }
    >
      {children}
    </ConsoleShell>
  )
}

export function AdminLayout() {
  const handle = useRouteHandle()
  const pending = usePendingSellerApplicationCount()
  // ✅ 관리자 이름은 GET /members/me(못 받으면 비움)
  const info = useQuery(myInfoQueryOptions())
  return (
    <AdminLayoutView
      title={handle.title ?? '관리자 콘솔'}
      pendingSellers={pending.data}
      adminName={info.data?.name}
    >
      <Outlet />
    </AdminLayoutView>
  )
}
