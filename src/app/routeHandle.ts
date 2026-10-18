import { useMatches } from 'react-router'

// 라우트별 화면 정보. 라우트 객체의 handle에 두고 레이아웃이 읽는다.
export type RouteHandle = {
  /** 화면 이름 (빈 페이지 제목, 판매자·관리자 모바일 상단 바 제목) */
  title?: string
  /** 화면 ID (SCREENS.md) */
  screenId?: string
  /** PublicLayout 모바일 상단 56 로고 바 (홈 · 상품 상세 · 판매자 상점처럼 제목이 본문에 있는 화면). 나머지는 PageHeader의 뒤로 바 */
  mobileHeader?: boolean
  /** PublicLayout 모바일 하단 탭 (최상위 화면만) */
  tabBar?: boolean
}

/** 지금 화면의 handle. 안쪽 라우트 값이 바깥 값을 덮는다 */
export function useRouteHandle(): RouteHandle {
  const matches = useMatches()
  const merged: RouteHandle = {}
  for (const match of matches) Object.assign(merged, match.handle as RouteHandle | undefined)
  return merged
}
