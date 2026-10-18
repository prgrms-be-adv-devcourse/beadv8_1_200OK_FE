// 판매자 센터 지연 로딩 청크. /seller/* 화면과 SellerLayout은 이 모듈에서만 불러온다(ADR-0003).
// 1단계에서 판매자 화면을 만들면 여기서 내보내고 routes.tsx의 해당 라우트가 이름으로 고른다.
export {
  SellerClaimsPage,
  SellerHomePage,
  SellerOrdersPage,
  SellerPayoutsPage,
  SellerProductFormPage,
  SellerProductsPage,
  SellerProfilePage,
  SellerWalletPage,
} from '@/features/seller'
export { SellerLayout } from '../layouts/SellerLayout'
export { ConsolePlaceholderPage as SellerPlaceholderPage } from '../pages/PlaceholderPage'
