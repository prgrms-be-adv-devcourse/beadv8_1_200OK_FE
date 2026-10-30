import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { MemberRole } from '@/shared/api/types'
import type { PreviewSession } from '@/shared/lib/screenPreview'
import { showToast } from '@/shared/ui'
import { AdminLayoutView } from '../layouts/AdminLayout'
import { AuthLayoutView } from '../layouts/AuthLayout'
import { MyPageLayoutView } from '../layouts/MyPageLayout'
import { PublicLayoutView } from '../layouts/PublicLayout'
import { SellerLayoutView } from '../layouts/SellerLayout'
import type { Session } from '../session'
import { screenPreviews } from './screenRegistry'

// /__design/screen/:screenId?state= — 갤러리가 iframe(1440 · 390)으로 띄우는 화면 상태 미리보기 (개발 전용)
// 화면 목록은 screenRegistry.ts

const sessions: Record<PreviewSession, Session> = {
  guest: { status: 'guest' },
  buyer: { status: 'authenticated', role: MemberRole.BUYER, nickname: '주말장보기' },
  seller: { status: 'authenticated', role: MemberRole.SELLER, nickname: '김영수' },
}

export function ScreenPreview() {
  const { screenId } = useParams()
  const [params] = useSearchParams()
  const screen = screenPreviews.find((s) => s.id === screenId)
  const state = screen?.states.find((s) => s.id === params.get('state')) ?? screen?.states[0]
  const toast = state?.toast

  useEffect(() => {
    if (!toast) return
    showToast({
      message: toast.message,
      action: toast.actionLabel ? { label: toast.actionLabel, onClick: () => {} } : undefined,
    })
  }, [toast])

  if (!screen || !state) return <p>알 수 없는 화면: {screenId}</p>

  const session = sessions[state.session ?? 'buyer']
  const path = state.path ?? screen.path
  switch (screen.layout) {
    case 'public':
    case 'mypage':
      return (
        <PublicLayoutView
          session={session}
          cartCount={session.status === 'authenticated' ? 2 : undefined}
          showMobileHeader={screen.mobileHeader}
          showTabBar={screen.tabBar}
          currentPath={path}
        >
          {screen.layout === 'mypage' ? (
            <MyPageLayoutView
              sellerStatus={state.sellerStatus ?? 'none'}
              onLogout={() => {}}
              currentPath={path}
            >
              {state.render()}
            </MyPageLayoutView>
          ) : (
            state.render()
          )}
        </PublicLayoutView>
      )
    case 'seller':
      return (
        <SellerLayoutView
          title={screen.pageTitle ?? screen.title}
          storeName="청송 햇살농원"
          userName="김영수"
          pendingOrders={5}
          pendingClaims={2}
          currentPath={path}
        >
          {state.render()}
        </SellerLayoutView>
      )
    case 'admin':
      return (
        <AdminLayoutView
          title={screen.pageTitle ?? screen.title}
          adminName="운영팀 정민호"
          pendingSellers={3}
          currentPath={path}
        >
          {state.render()}
        </AdminLayoutView>
      )
    case 'auth':
      return <AuthLayoutView>{state.render()}</AuthLayoutView>
  }
}
