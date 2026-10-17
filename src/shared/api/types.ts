// 백엔드 API 타입. 원본: bruno_for_front/README.md 4장, enum 값은 bruno_for_front/enums.ts (최신 기준은 서버 Swagger)
// 서버 enum은 TS enum으로 둔다(값 = 서버 문자열). const enum은 쓰지 않는다(파일 단위 변환에서 깨짐).
// 화면 표시명은 shared/lib/labels.ts.

// ─── Enum ────────────────────────────────────────────────

export enum ProductCategoryGroup {
  AGRICULTURE = 'AGRICULTURE',
}

export enum ProductCategory {
  GRAIN = 'GRAIN',
  VEGETABLE = 'VEGETABLE',
  FRUIT = 'FRUIT',
  ROOT_CROP = 'ROOT_CROP',
  MUSHROOM = 'MUSHROOM',
  NUT = 'NUT',
  WILD_GREENS = 'WILD_GREENS',
  PROCESSED_AGRI = 'PROCESSED_AGRI',
}

export enum ProductRegion {
  SEOUL = 'SEOUL',
  BUSAN = 'BUSAN',
  DAEGU = 'DAEGU',
  INCHEON = 'INCHEON',
  GWANGJU = 'GWANGJU',
  DAEJEON = 'DAEJEON',
  ULSAN = 'ULSAN',
  SEJONG = 'SEJONG',
  GYEONGGI = 'GYEONGGI',
  GANGWON = 'GANGWON',
  CHUNGBUK = 'CHUNGBUK',
  CHUNGNAM = 'CHUNGNAM',
  JEONBUK = 'JEONBUK',
  JEONNAM = 'JEONNAM',
  GYEONGBUK = 'GYEONGBUK',
  GYEONGNAM = 'GYEONGNAM',
  JEJU = 'JEJU',
}

export enum ProductStatus {
  READY = 'READY',
  ON_SALE = 'ON_SALE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
}

export enum ProductVisibility {
  VISIBLE = 'VISIBLE',
  HIDDEN = 'HIDDEN',
}

export enum MediaPurpose {
  PRODUCT = 'PRODUCT',
  PRODUCT_REVIEW = 'PRODUCT_REVIEW',
  MEMBER_PROFILE = 'MEMBER_PROFILE',
  SELLER_PROFILE = 'SELLER_PROFILE',
}

export enum MemberRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

export enum TermsType {
  ELECTRONIC_FINANCIAL_TRANSACTION = 'ELECTRONIC_FINANCIAL_TRANSACTION',
  PREPAID_PAYMENT_INSTRUMENT = 'PREPAID_PAYMENT_INSTRUMENT',
  PERSONAL_INFORMATION_COLLECTION = 'PERSONAL_INFORMATION_COLLECTION',
}

export enum ReviewMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export enum PayoutEventType {
  SALE_AMOUNT = 'SALE_AMOUNT',
  SALE_SHIPPING_FEE = 'SALE_SHIPPING_FEE',
  SALE_FEE = 'SALE_FEE',
}

// TODO(api): bruno_for_front/enums.ts에 아직 없다(주문 조회 API 없음). 시안의 주문 상품 상태 8종으로 임시로 정했고,
// API가 나오면 값을 서버 문자열로 바꾼다.
export enum OrderItemStatus {
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PREPARING = 'PREPARING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  PURCHASE_CONFIRMED = 'PURCHASE_CONFIRMED',
  CANCEL_REQUESTED = 'CANCEL_REQUESTED',
  CANCELED = 'CANCELED',
}

// ─── 공통 ────────────────────────────────────────────────

export type ProblemDetail = {
  type: string // 기본 "about:blank"
  title: string // 기본 HTTP 상태 문구 (PROBLEM_BASE_URI 설정 시 오류 코드 이름)
  status: number // 분기용
  detail: string // 사용자에게 보여줄 메시지
  instance: string
  errors?: { detail: string; pointer: string; path: string }[] // 422 검증 실패일 때만
}

export type ProductPage<T> = {
  content: T[]
  page: number // 0부터
  size: number
  totalElements: number
  totalPages: number
}

export type PayoutPage<T> = ProductPage<T>

// ─── 회원·인증 ───────────────────────────────────────────

export type SignupRequest = {
  loginId: string // 영문 소문자·숫자 4~20자 (대문자는 서버가 소문자로 바꿈)
  password: string // 영문·숫자·특수문자 모두 포함 8~20자
  email: string // 255자 이하
  name: string // 50자 이하
  nickname: string // 2~30자
  termsAgreed: true
  privacyAgreed: true
}

export type SignupResponse = { memberId: number }

export type LoginRequest = { loginId: string; password: string }

export type LoginResponse = {
  tokenType: 'Bearer'
  accessToken: string
  accessTokenExpiresAt: string // UTC, Z
  refreshToken: string
  refreshTokenExpiresAt: string // UTC, Z
}

// ─── 미디어 ──────────────────────────────────────────────

export type MediaInfo = { mediaId: number; url: string }

// ─── 상품 (구매자) ───────────────────────────────────────

export type CategoryGroup = {
  group: ProductCategoryGroup
  description: string
  categories: { code: ProductCategory; description: string }[]
}

export type ProductSummary = {
  productId: number
  name: string
  thumbnailUrl: string
  minSalePrice: number // 옵션 중 최저 판매가
  minPriceListPrice: number // 그 옵션의 정가
  discountRate: number // %, 소수점 버림
  category: ProductCategory
  region: ProductRegion
  status: ProductStatus // ON_SALE이 아니면 판매 예정·일시 중지·판매 종료로 표시
  soldOut: boolean // 모든 옵션 품절
  reviewCount: number
  averageRating: number // 5점 만점, 소수 첫째 자리. 리뷰 없으면 0
}

export type ProductOption = {
  optionId: number // 장바구니·리뷰에 씀
  name: string
  listPrice: number
  salePrice: number
  discountRate: number
  soldOut: boolean // 재고 수량은 내려주지 않음
}

export type ProductDetail = {
  productId: number
  name: string
  descriptionHtml: string // 서버가 저장 시 정제한 HTML
  categoryGroup: ProductCategoryGroup
  category: ProductCategory
  region: ProductRegion
  status: ProductStatus // ON_SALE일 때만 구매 가능
  minSalePrice: number
  minPriceListPrice: number
  discountRate: number
  soldOut: boolean
  reviewCount: number
  averageRating: number
  imageUrls: string[] // 첫 장이 대표
  options: ProductOption[] // 화면 순서
  createdAt: string
  updatedAt: string
}

export type ProductListParams = {
  categoryGroup?: ProductCategoryGroup
  category?: ProductCategory
  region?: ProductRegion
  page?: number
  size?: number
}

// ─── 상품 (판매자, 임시 헤더) ─────────────────────────────

export type ProductCreateRequest = {
  name: string // 100자 이하
  descriptionHtml: string
  category: ProductCategory
  region: ProductRegion
  status?: ProductStatus // 생략 시 READY
  visibility?: ProductVisibility // 생략 시 HIDDEN
  imageUrls: string[] // 1~10장, 미디어 업로드(PRODUCT) URL만
  options: {
    // 1~50개, 옵션명 중복 불가
    name: string // 100자 이하
    listPrice?: number // 생략 시 salePrice와 같음
    salePrice: number // ≤ listPrice, 1억 이하
    totalStock: number // 0 이상
  }[]
}

export type ProductCreateResponse = { productId: number }

// status, visibility는 수정에서 생략하면 그대로 유지
export type ProductUpdateRequest = Omit<ProductCreateRequest, 'options'> & {
  version: number // 화면을 열 때 받은 version. 다르면 409
  options: {
    id?: number // 있으면 수정, 없으면 추가. 빠진 기존 옵션은 삭제
    name: string
    listPrice?: number
    salePrice: number
    totalStock: number // 주문에 배정된 수량보다 작게 못 줄임
  }[]
}

export type ProductStatusRequest = { status: ProductStatus }

export type ProductVisibilityRequest = { visibility: ProductVisibility }

// ─── 장바구니 ────────────────────────────────────────────

export type CartItem = {
  cartItemId: number
  productOptionId: number
  quantity: number
  selected: boolean
}

export type Cart = {
  cartId: number
  items: CartItem[]
}

export type CartItemAddRequest = { productOptionId: number; quantity: number }

export type CartItemAddResponse = { cartItemId: number }

export type CartQuantityRequest = { quantity: number }

export type CartSelectionRequest = { selected: boolean }

// ─── 지갑 약관 ───────────────────────────────────────────

export type TermsItem = {
  type: TermsType
  version: number
  title: string
  content: string // 약관 전문
  required: boolean
  agreed: boolean // 현재 버전에 동의했는지
}

export type TermsResponse = { terms: TermsItem[] }

export type TermsAgreeRequest = { agreements: { type: TermsType; version: number }[] } // 1~10개

// ─── 주문 ────────────────────────────────────────────────

export type CheckoutItem = {
  productOptionId: number
  productName: string
  productOptionName: string
  unitPrice: number
  quantity: number
  itemAmount: number // unitPrice × quantity
}

export type CheckoutSellerGroup = {
  sellerId: number
  shippingFee: number // 지금은 항상 0 (배송비 정책 미정)
  items: CheckoutItem[]
}

export type Checkout = {
  sellerGroups: CheckoutSellerGroup[]
  totalProductAmount: number
  totalShippingFee: number
  totalAmount: number // 도서산간 운임 제외
}

export type CreateOrderRequest = {
  recipientName: string // 50자 이하
  recipientPhone: string // "010-1234-5678" 형식 (하이픈 필수)
  zipCode: string // 숫자 5자리
  address: string // 200자 이하
  addressDetail?: string // 100자 이하
  thirdPartyProvisionAgreed: true
  expectedTotalAmount: number // 화면에 보여준 최종 금액 (totalAmount + 도서산간 운임)
}

export type CreateOrderResponse = { orderId: number }

// ─── 리뷰 ────────────────────────────────────────────────

export type ProductReviewCreateRequest = {
  productOptionId: number
  orderId: number
  orderItemId: number
  rating: number // 1~10 정수 (0.5점 단위 × 2, 9 = 4.5점)
  content: string // 2,000자 이하
  mediaUrls?: string[] // 0~6개, 영상(mp4) 1개까지, 미디어 업로드(PRODUCT_REVIEW) URL만
}

export type ProductReviewCreateResponse = { reviewId: number }

export type ProductReviewUpdateRequest = {
  rating: number
  content: string
  mediaUrls?: string[] // 전체 교체. 생략·빈 배열이면 첨부 전부 삭제
}

// 리뷰 목록은 최신순(reviewId 내림차순)
export type ProductReview = {
  reviewId: number
  productId: number
  productOptionId: number
  optionName: string
  memberId: number // 작성자 닉네임은 아직 안 내려줌
  rating: number // 1~10, 화면에는 /2
  content: string
  media: { type: ReviewMediaType; url: string }[]
  createdAt: string
  updatedAt: string
}

// ─── 정산 (임시 헤더) ────────────────────────────────────

export type PayoutSummary = {
  payoutId: number
  snapshotId: number
  payeeId: number | null // 시스템 몫이면 null
  system: boolean // 플랫폼 수수료 몫이면 true
  amount: number // 0 이하일 수 있음
  createdAt: string // 정산 확정 시각
}

export type PayoutDetail = PayoutSummary & {
  periodFrom: string | null // 포함. 첫 정산이면 null
  periodTo: string // 미포함
  itemCount: number
  systemPayoutId: number | null // 관리자가 판매자 정산을 볼 때만
  sellerFeeAmount: number | null // 판매자 정산일 때만
  sellerFeeItemCount: number | null // 판매자 정산일 때만
}

export type PayoutItem = {
  payoutItemId: number
  candidateId: number
  eventType: PayoutEventType
  orderItemId: number
  sellerId: number
  amount: number // 조정 건이면 음수 가능
  candidateCreatedAt: string
  adjustment: {
    adjustmentId: number | null // 판매자 조회 시 null
    adminId: number | null // 판매자 조회 시 null
    reason: string // 관리자 입력 원문 → 출력 시 HTML 이스케이프
  } | null // 평소 건이면 null
}

// from(포함)·to(미포함) 필수, "yyyy-MM-ddTHH:mm:ss", 최대 1년. 판매자는 payeeId에 본인 ID 필수. size 1~100
export type PayoutListParams = {
  payeeId?: number
  system?: boolean
  from: string
  to: string
  page?: number
  size?: number
}
