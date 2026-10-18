import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { ProductCategory, ProductRegion } from '@/shared/api/types'
import { categoryLabels } from '@/shared/lib/labels'
import { showToast } from '@/shared/ui'
import { errorMessageOf, useCategories, useProductPages } from '../queries'
import type { CategoryOption } from '../types'
import { ProductListView } from '../views/ProductListView'
import { useLocalLikes } from './useLocalLikes'

// 상품 목록 라우트 /products?category&region&page. 필터·페이지는 URL searchParams가 기준이다.
// page는 ‘더 보기’로 불러온 마지막 페이지(0부터)라 새로 고쳐도 본 데까지 다시 그린다. 검색어·정렬 API는 없다(A-9).

const asEnum = <T extends string>(values: Record<string, T>, value: string | null): T | null =>
  value && (Object.values(values) as string[]).includes(value) ? (value as T) : null

const asPage = (value: string | null) => {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 0
}

// 카테고리 API를 받기 전·실패했을 때는 같은 표시명 표로 그린다(A-1)
const fallbackCategories: CategoryOption[] = Object.values(ProductCategory).map((code) => ({
  code,
  label: categoryLabels[code],
}))

export function ProductListPage() {
  const [params, setParams] = useSearchParams()
  const category = asEnum(ProductCategory, params.get('category'))
  const region = asEnum(ProductRegion, params.get('region'))
  const page = asPage(params.get('page'))
  const [hideSoldOut, setHideSoldOut] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const { isLiked, toggleLike } = useLocalLikes()
  const queryClient = useQueryClient()
  const categories = useCategories()

  const list = useProductPages(
    { category: category ?? undefined, region: region ?? undefined },
    page,
  )
  // 품절 제외는 서버 파라미터가 없어 불러온 목록에서 거른다
  const visible = hideSoldOut ? list.items.filter((product) => !product.soldOut) : list.items
  const hiddenSoldOutCount = list.items.length - visible.length

  const changeRegion = (next: ProductRegion | null) => {
    const nextParams = new URLSearchParams(params)
    if (next) nextParams.set('region', next)
    else nextParams.delete('region')
    nextParams.delete('page')
    setParams(nextParams)
  }

  // 다음 페이지를 먼저 받아 두고 URL을 바꾼다. 실패하면 목록은 그대로 두고 알린다
  const loadMore = async () => {
    setLoadingMore(true)
    try {
      await queryClient.fetchQuery(list.nextPageOptions)
      const nextParams = new URLSearchParams(params)
      nextParams.set('page', String(list.nextPage))
      setParams(nextParams, { replace: true, preventScrollReset: true })
    } catch (error) {
      showToast({
        message: errorMessageOf(error) ?? '상품을 더 불러오지 못했어요',
        action: { label: '다시 시도', onClick: loadMore },
      })
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <ProductListView
      status={list.status}
      items={visible.map((product) => ({ product, liked: isLiked(product.productId) }))}
      totalCount={list.totalCount - hiddenSoldOutCount}
      categories={categories.data ?? fallbackCategories}
      category={category}
      region={region}
      onRegionChange={changeRegion}
      hideSoldOut={hideSoldOut}
      onHideSoldOutChange={setHideSoldOut}
      hiddenSoldOutCount={hiddenSoldOutCount}
      hasMore={list.hasMore}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
      onToggleLike={toggleLike}
      onRetry={list.retry}
      errorMessage={errorMessageOf(list.error)}
    />
  )
}
