import type { ReactNode } from 'react'

// /__design 화면 상태 갤러리(개발 전용)의 계약. feature마다 previews.tsx에서 이 모양으로 내보내고
// app/dev가 /__design/screen/:screenId?state= 로 레이아웃에 끼워 그린다. 검토 패널의 상태 하나 = state 하나.

export type PreviewSession = 'guest' | 'buyer' | 'seller'

export type ScreenPreviewState = {
  id: string
  label: string
  /** 헤더가 그릴 로그인 상태. 기본 buyer */
  session?: PreviewSession
  /** 열자마자 띄울 토스트 (담기 성공 등) */
  toast?: { message: string; actionLabel?: string }
  /** 레이아웃이 활성 메뉴를 고를 주소 (화면 기본값 대신, 탭이 다른 상태) */
  path?: string
  /** 마이 레이아웃의 판매자 메뉴 문구. 기본 none */
  sellerStatus?: 'none' | 'applying' | 'approved'
  render: () => ReactNode
}

export type ScreenPreview = {
  /** 앱 전체에서 겹치지 않는 이름 (주소에 쓴다) */
  id: string
  title: string
  /** 판매자·관리자 레이아웃 상단 바 제목 (기본 title) */
  pageTitle?: string
  /** mypage = PublicLayout 안의 MyPageLayout */
  layout: 'public' | 'mypage' | 'auth' | 'seller' | 'admin'
  /** 레이아웃이 활성 메뉴를 고를 주소 */
  path: string
  /** PublicLayout 모바일 로고 바 · 하단 탭 (routes.tsx handle과 같게) */
  mobileHeader?: boolean
  tabBar?: boolean
  states: ScreenPreviewState[]
}
