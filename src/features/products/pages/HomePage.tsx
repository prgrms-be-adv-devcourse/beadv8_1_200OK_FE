import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { type LoginReason, useWishToggle } from '@/shared/ui'
import { errorMessageOf, productListQueryOptions } from '../queries'
import { HomeView } from '../views/HomeView'

// B-01 홈 라우트. 이번 주 상품 = GET /products 첫 페이지(최신순).
// 하트는 찜 ID 집합(shared/api/wishes.ts)으로 그린다. 비회원이 누르면 로그인 안내, 관리자는 하트를 그리지 않는다.
// TODO(api): ❌ 인기 농가, 📝 팔로우 API가 없다. 농가는 넘기지 않아 ‘연결 전’ 안내를 보이고,
//   팔로우 핸들러도 넘기지 않아 팔로우 버튼을 그리지 않는다.

const HOME_PRODUCT_COUNT = 8

export function HomePage() {
  const products = useQuery(productListQueryOptions({ page: 0, size: HOME_PRODUCT_COUNT }))
  const [loginPrompt, setLoginPrompt] = useState<LoginReason | null>(null)
  const wishes = useWishToggle(() => setLoginPrompt('like'))
  const items = (products.data?.content ?? []).map((product) => ({
    product,
    liked: wishes.isWished(product.productId),
  }))

  return (
    <HomeView
      // 다시 불러오다 실패해도 이미 받은 목록은 그대로 보여 준다
      status={products.data ? 'success' : products.status}
      items={items}
      onToggleLike={wishes.access === 'admin' ? undefined : wishes.toggle}
      onRetry={() => products.refetch()}
      errorMessage={errorMessageOf(products.error)}
      loginPrompt={loginPrompt}
      onLoginPromptClose={() => setLoginPrompt(null)}
    />
  )
}
