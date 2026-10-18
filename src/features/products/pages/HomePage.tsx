import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { showToast } from '@/shared/ui'
import { farmItems } from '../fixtures'
import { errorMessageOf, productListQueryOptions } from '../queries'
import { HomeView } from '../views/HomeView'
import { useLocalLikes } from './useLocalLikes'

// B-01 홈 라우트. 이번 주 상품 = GET /products 첫 페이지(최신순).
// TODO(api): 팔로우·인기 농가는 API가 없어 화면 안 상태 + fixtures 유지(📝/❌).

const HOME_PRODUCT_COUNT = 8

export function HomePage() {
  const products = useQuery(productListQueryOptions({ page: 0, size: HOME_PRODUCT_COUNT }))
  const { isLiked, toggleLike } = useLocalLikes()
  const [farms, setFarms] = useState(farmItems)

  const items = (products.data?.content ?? []).map((product) => ({
    product,
    liked: isLiked(product.productId),
  }))

  const toggleFollow = (sellerId: number) => {
    const target = farms.find((farm) => farm.seller.sellerId === sellerId)
    if (!target) return
    setFarms(
      farms.map((farm) => (farm === target ? { ...farm, following: !farm.following } : farm)),
    )
    showToast({
      message: target.following
        ? '팔로우를 취소했어요'
        : `${target.seller.storeName}을 팔로우했어요`,
    })
  }

  return (
    <HomeView
      // 다시 불러오다 실패해도 이미 받은 목록은 그대로 보여 준다
      status={products.data ? 'success' : products.status}
      items={items}
      farms={farms}
      onToggleLike={toggleLike}
      onToggleFollow={toggleFollow}
      onRetry={() => products.refetch()}
      errorMessage={errorMessageOf(products.error)}
    />
  )
}
