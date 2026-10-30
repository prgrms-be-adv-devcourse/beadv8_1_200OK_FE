// products 공개 계약 (ADR-0003). app은 여기서만 import한다.
// 화면 상태 갤러리는 개발 전용이라 따로 둔다: '@/features/products/previews'
export { HomePage } from './pages/HomePage'
export { ProductDetailPage } from './pages/ProductDetailPage'
export { ProductListPage } from './pages/ProductListPage'
// 다른 feature가 쓰는 조회. 캐시 무효화는 키 팩토리 대신 접두어로 한다(shared/api/queryKeys.ts)
export {
  categoriesQueryOptions,
  useCategories,
  useProduct,
} from './queries'
export type { CategoryOption } from './types'
