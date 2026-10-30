import { useQuery } from '@tanstack/react-query'
import { errorMessageOf, productListQueryOptions } from '../queries'
import { HomeView } from '../views/HomeView'

// B-01 홈 라우트. 이번 주 상품 = GET /products 첫 페이지(최신순).
// TODO(api): ❌ 인기 농가, 📝 관심·팔로우 API가 없다. 농가는 넘기지 않아 ‘연결 전’ 안내를 보이고,
//   관심·팔로우 핸들러도 넘기지 않아 카드에 하트·팔로우 버튼을 그리지 않는다.

const HOME_PRODUCT_COUNT = 8

export function HomePage() {
  const products = useQuery(productListQueryOptions({ page: 0, size: HOME_PRODUCT_COUNT }))
  const items = (products.data?.content ?? []).map((product) => ({ product }))

  return (
    <HomeView
      // 다시 불러오다 실패해도 이미 받은 목록은 그대로 보여 준다
      status={products.data ? 'success' : products.status}
      items={items}
      onRetry={() => products.refetch()}
      errorMessage={errorMessageOf(products.error)}
    />
  )
}
