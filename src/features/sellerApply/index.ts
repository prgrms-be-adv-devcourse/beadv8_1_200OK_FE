// sellerApply 공개 계약 (ADR-0003). 구매자 쪽 판매자 신청·현황 화면이다.
// 판매자 센터(features/seller)는 지연 로딩 청크라 메인 번들에 섞이지 않게 따로 둔다.
// 화면 상태 갤러리는 개발 전용: '@/features/sellerApply/previews'
export { SellerApplyPage, SellerStatusPage } from './pages/SellerApplyPages'
