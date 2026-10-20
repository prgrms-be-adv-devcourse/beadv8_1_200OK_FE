import {
  ChargeStatus,
  LedgerType,
  MediaPurpose,
  MemberRole,
  OrderItemStatus,
  OrderStatus,
  PayoutEventType,
  ProductCategory,
  ProductCategoryGroup,
  ProductRegion,
  ProductStatus,
  ProductVisibility,
  type RegionGroup,
  ReviewMediaType,
  ShipmentCarrier,
  TermsType,
} from '@/shared/api/types'

// 서버 enum → 화면 표시명. 원본: bruno_for_front/enums.ts (값이 바뀌면 이 파일과 types.ts를 함께 고친다)
// 카테고리는 GET /products/categories 응답의 description을 우선하고, 이 표는 응답 전·없는 곳에서 쓴다.

export const categoryGroupLabels: Record<ProductCategoryGroup, string> = {
  [ProductCategoryGroup.AGRICULTURE]: '농산물',
}

/** 하위 카테고리가 속한 상위 카테고리 */
export const categoryGroupOf: Record<ProductCategory, ProductCategoryGroup> = {
  [ProductCategory.GRAIN]: ProductCategoryGroup.AGRICULTURE,
  [ProductCategory.VEGETABLE]: ProductCategoryGroup.AGRICULTURE,
  [ProductCategory.FRUIT]: ProductCategoryGroup.AGRICULTURE,
  [ProductCategory.ROOT_CROP]: ProductCategoryGroup.AGRICULTURE,
  [ProductCategory.MUSHROOM]: ProductCategoryGroup.AGRICULTURE,
  [ProductCategory.NUT]: ProductCategoryGroup.AGRICULTURE,
  [ProductCategory.WILD_GREENS]: ProductCategoryGroup.AGRICULTURE,
  [ProductCategory.PROCESSED_AGRI]: ProductCategoryGroup.AGRICULTURE,
}

export const categoryLabels: Record<ProductCategory, string> = {
  [ProductCategory.GRAIN]: '쌀·잡곡',
  [ProductCategory.VEGETABLE]: '채소',
  [ProductCategory.FRUIT]: '과일',
  [ProductCategory.ROOT_CROP]: '감자·고구마',
  [ProductCategory.MUSHROOM]: '버섯',
  [ProductCategory.NUT]: '견과·땅콩',
  [ProductCategory.WILD_GREENS]: '나물·산채',
  [ProductCategory.PROCESSED_AGRI]: '농산 가공품',
}

export const regionLabels: Record<ProductRegion, string> = {
  [ProductRegion.SEOUL]: '서울',
  [ProductRegion.BUSAN]: '부산',
  [ProductRegion.DAEGU]: '대구',
  [ProductRegion.INCHEON]: '인천',
  [ProductRegion.GWANGJU]: '광주',
  [ProductRegion.DAEJEON]: '대전',
  [ProductRegion.ULSAN]: '울산',
  [ProductRegion.SEJONG]: '세종',
  [ProductRegion.GYEONGGI]: '경기',
  [ProductRegion.GANGWON]: '강원',
  [ProductRegion.CHUNGBUK]: '충북',
  [ProductRegion.CHUNGNAM]: '충남',
  [ProductRegion.JEONBUK]: '전북',
  [ProductRegion.JEONNAM]: '전남',
  [ProductRegion.GYEONGBUK]: '경북',
  [ProductRegion.GYEONGNAM]: '경남',
  [ProductRegion.JEJU]: '제주',
}

// 판매자 상품 관리에서 쓰는 판매 상태 이름. 구매자 배지 문구(판매 예정·일시 품절 등)는 StatusBadge가 정한다.
export const productStatusLabels: Record<ProductStatus, string> = {
  [ProductStatus.READY]: '판매 준비',
  [ProductStatus.ON_SALE]: '판매 중',
  [ProductStatus.PAUSED]: '일시 중지',
  [ProductStatus.ENDED]: '판매 종료',
}

export const productVisibilityLabels: Record<ProductVisibility, string> = {
  [ProductVisibility.VISIBLE]: '노출',
  [ProductVisibility.HIDDEN]: '숨김',
}

export const mediaPurposeLabels: Record<MediaPurpose, string> = {
  [MediaPurpose.PRODUCT]: '상품 이미지',
  [MediaPurpose.PRODUCT_REVIEW]: '리뷰 첨부',
  [MediaPurpose.MEMBER_PROFILE]: '회원 프로필',
  [MediaPurpose.SELLER_PROFILE]: '판매자 프로필',
}

export const memberRoleLabels: Record<MemberRole, string> = {
  [MemberRole.BUYER]: '구매자',
  [MemberRole.SELLER]: '판매자',
  [MemberRole.ADMIN]: '관리자',
}

// 약관 제목·전문·버전·필수 여부는 GET /wallets/me/terms 응답을 쓰고, 이 표는 응답 전·없는 곳에서 쓴다.
export const termsTypeLabels: Record<TermsType, string> = {
  [TermsType.ELECTRONIC_FINANCIAL_TRANSACTION]: '전자금융거래 이용약관',
  [TermsType.PREPAID_PAYMENT_INSTRUMENT]: '선불전자지급수단 이용약관',
  [TermsType.PERSONAL_INFORMATION_COLLECTION]: '개인정보 수집 및 이용 동의',
}

export const reviewMediaTypeLabels: Record<ReviewMediaType, string> = {
  [ReviewMediaType.IMAGE]: '이미지',
  [ReviewMediaType.VIDEO]: '영상',
}

export const payoutEventTypeLabels: Record<PayoutEventType, string> = {
  [PayoutEventType.SALE_AMOUNT]: '상품판매 대금',
  [PayoutEventType.SALE_FEE]: '상품판매 수수료',
  [PayoutEventType.SALE_SHIPPING_FEE]: '상품판매 배송비',
}

// 주문 상품 상태 8종 (GET /orders/{orderId} items[].status, design/COMPONENTS.md 상태 배지 세트)
export const orderItemStatusLabels: Record<OrderItemStatus, string> = {
  [OrderItemStatus.PAYMENT_PENDING]: '결제 대기',
  [OrderItemStatus.PAYMENT_FAILED]: '결제 실패',
  [OrderItemStatus.PREPARING]: '상품 준비 중',
  [OrderItemStatus.SHIPPING]: '배송 중',
  [OrderItemStatus.DELIVERED]: '배송 완료',
  [OrderItemStatus.PURCHASE_CONFIRMED]: '구매확정',
  [OrderItemStatus.CANCEL_REQUESTED]: '취소 요청됨',
  [OrderItemStatus.REFUNDED]: '환불 완료',
}

// 주문 전체 상태 (주문 목록·상세 status)
export const orderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.PAYMENT_PENDING]: '결제 대기',
  [OrderStatus.PAID]: '결제 완료',
  [OrderStatus.PAYMENT_FAILED]: '결제 실패',
  [OrderStatus.CANCELED]: '주문 취소',
}

export const chargeStatusLabels: Record<ChargeStatus, string> = {
  [ChargeStatus.PENDING]: '결제 대기',
  [ChargeStatus.IN_PROGRESS]: '확인 중',
  [ChargeStatus.COMPLETED]: '충전 완료',
  [ChargeStatus.FAILED]: '실패',
}

export const ledgerTypeLabels: Record<LedgerType, string> = {
  [LedgerType.CHARGE]: '충전',
  [LedgerType.PAYMENT]: '결제',
}

export const carrierLabels: Record<ShipmentCarrier, string> = {
  [ShipmentCarrier.CJ_LOGISTICS]: 'CJ대한통운',
  [ShipmentCarrier.POST_OFFICE]: '우체국택배',
  [ShipmentCarrier.HANJIN]: '한진택배',
  [ShipmentCarrier.LOTTE]: '롯데택배',
  [ShipmentCarrier.LOGEN]: '로젠택배',
}

/** 배송지 지역 그룹 이름 (배송비 견적 regionGroup) */
export const regionGroupLabels: Record<RegionGroup, string> = {
  GENERAL: '일반 지역',
  JEJU_MAIN: '제주',
  JEJU_ISLANDS: '제주 부속 도서',
  ULLEUNG: '울릉',
  WEST_SEA_ISLANDS: '서해 5도',
  ETC_ISLANDS: '기타 도서',
  MOUNTAIN: '산간',
}
