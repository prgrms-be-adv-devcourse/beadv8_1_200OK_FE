// cart 공개 계약 (ADR-0003). 화면 상태 갤러리는 개발 전용: '@/features/cart/previews'
// 2단계에서 상품 상세의 담기용 공개 hook(useAddToCart)을 여기서 내보낸다(products → cart 예외).
export { CartPage } from './pages/CartPage'
