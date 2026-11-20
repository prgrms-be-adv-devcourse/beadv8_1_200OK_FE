import { recentDays } from '@/shared/lib/dateRange'
import type { SearchInsightsParams } from './types'

// 검색 점검 조건(기간 · 개수). 두 탭이 같이 쓰고, 화면 값이 곧 API 파라미터다(yyyy-MM-dd, 둘 다 포함).

/** 개수 고르기. 서버는 1~100을 받는다 */
export const SEARCH_INSIGHTS_LIMITS = [20, 50, 100] as const

export const defaultSearchInsightsFilter = (): SearchInsightsParams => ({
  ...recentDays(7),
  limit: SEARCH_INSIGHTS_LIMITS[0],
})

/** 보내기 전에 알 수 있는 기간 오류. 보존 기간은 서버 설정이라 서버 400으로 안내한다(errors.ts) */
export function searchInsightsRangeError({ from, to }: Pick<SearchInsightsParams, 'from' | 'to'>) {
  return from > to ? '시작일이 종료일보다 늦어요' : null
}
