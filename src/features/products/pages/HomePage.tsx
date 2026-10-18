import { useState } from 'react'
import { showToast } from '@/shared/ui'
import { farmItems, productCardItems } from '../fixtures'
import { HomeView } from '../views/HomeView'

// B-01 홈 라우트. 1단계: fixtures로 그린다.
// TODO(api): 2-2 GET /products(첫 페이지)로 바꾼다. 관심·팔로우·인기 농가는 API가 없어 fixtures 유지(📝/❌).

export function HomePage() {
  const [items, setItems] = useState(productCardItems)
  const [farms, setFarms] = useState(farmItems)

  const toggleLike = (productId: number) => {
    const target = items.find((item) => item.product.productId === productId)
    if (!target) return
    setItems(items.map((item) => (item === target ? { ...item, liked: !item.liked } : item)))
    showToast({ message: target.liked ? '관심 상품에서 뺐어요' : '관심 상품에 담았어요' })
  }

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
      status="success"
      items={items}
      farms={farms}
      onToggleLike={toggleLike}
      onToggleFollow={toggleFollow}
    />
  )
}
