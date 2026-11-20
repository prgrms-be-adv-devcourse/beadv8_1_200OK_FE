import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { ApiError } from '@/shared/api/ApiError'
import { searchInsightsErrorMessage } from '../errors'
import { useUntaggedProducts, useZeroResultKeywords } from '../queries'
import { defaultSearchInsightsFilter, searchInsightsRangeError } from '../searchInsightsFilter'
import { type SearchInsightsParams, SearchInsightsTab } from '../types'
import { SearchInsightsView } from '../views/SearchInsightsView'

// M-05 검색 점검 라우트 /admin/search-insights?tab=untagged (관리자 콘솔 청크, Bearer ADMIN).
// ✅ GET /admin/product-search/zero-result-keywords · untagged-products. 탭은 주소에, 기간·개수는 두 탭이 같이 쓴다.

const tabOf = (value: string | null) =>
  value === SearchInsightsTab.UNTAGGED ? SearchInsightsTab.UNTAGGED : SearchInsightsTab.ZERO_RESULT

/** 400(기간 · 개수)은 다시 해도 같아서 다시 시도를 두지 않는다 */
function listProps(query: {
  isPending: boolean
  isError: boolean
  error: ApiError | null
  refetch: () => unknown
}) {
  if (query.isError) {
    return {
      status: 'error' as const,
      errorMessage: searchInsightsErrorMessage(query.error),
      onRetry: query.error?.status === 400 ? undefined : () => void query.refetch(),
    }
  }
  return { status: query.isPending ? ('pending' as const) : ('success' as const) }
}

export function AdminSearchInsightsPage() {
  const [params, setParams] = useSearchParams()
  const tab = tabOf(params.get('tab'))
  const [filter, setFilter] = useState<SearchInsightsParams>(defaultSearchInsightsFilter)
  const valid = searchInsightsRangeError(filter) === null

  const keywords = useZeroResultKeywords(filter, valid && tab === SearchInsightsTab.ZERO_RESULT)
  const products = useUntaggedProducts(filter, valid && tab === SearchInsightsTab.UNTAGGED)

  return (
    <SearchInsightsView
      tab={tab}
      onTabChange={(next) => setParams(next === SearchInsightsTab.UNTAGGED ? { tab: next } : {})}
      filter={filter}
      onFilterChange={setFilter}
      {...listProps(tab === SearchInsightsTab.ZERO_RESULT ? keywords : products)}
      keywords={keywords.data ?? []}
      products={products.data ?? []}
    />
  )
}
