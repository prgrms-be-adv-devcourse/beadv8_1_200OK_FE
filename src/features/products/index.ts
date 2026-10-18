// products 공개 계약 (ADR-0003). app은 여기서만 import한다.
// 화면 상태 갤러리는 개발 전용이라 따로 둔다: '@/features/products/previews'
export { HomePage } from './pages/HomePage'
export { ProductDetailPage } from './pages/ProductDetailPage'
export { ProductListPage } from './pages/ProductListPage'
