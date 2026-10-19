import { Group } from '@mantine/core'
import { BadgeCheck, User, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { useRouteHandle } from '../routeHandle'
import { type ConsoleNavItem, ConsoleShell } from './ConsoleShell'

// 운영 관리자 콘솔 레이아웃(제안, DECISIONS.md B-2). 어두운 상단 바 + ‘관리자 콘솔’ 배지 + 사이드바.
// 시안: admin/AdminSellers, AdminSettlements

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
  // TODO(api): 관리자 이름·심사 대기 수는 관리자 API가 생기면 채운다
  return (
    <AdminLayoutView title={handle.title ?? '관리자 콘솔'}>
      <Outlet />
    </AdminLayoutView>
  )
}
