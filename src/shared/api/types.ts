// 백엔드 API 타입(origin/dev 기준). 원본: bruno_for_front/README.md 4장, enum 값은 bruno_for_front/enums.ts (최신 기준은 서버 Swagger)
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

/** 주문 상품(orderItem) 상태. 주문 상세 GET /orders/{orderId}의 items[].status */
export enum OrderItemStatus {
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PREPARING = 'PREPARING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  PURCHASE_CONFIRMED = 'PURCHASE_CONFIRMED',
  CANCEL_REQUESTED = 'CANCEL_REQUESTED',
  REFUNDED = 'REFUNDED',
}

/** 주문 전체 상태. 주문 목록·상세의 status */
export enum OrderStatus {
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAID = 'PAID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CANCELED = 'CANCELED',
}

/** 예치금 충전 건 상태 */
export enum ChargeStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/** 예치금 이용 내역 유형 */
export enum LedgerType {
  CHARGE = 'CHARGE',
  PAYMENT = 'PAYMENT',
}

/** 택배사 (출고 등록) */
export enum ShipmentCarrier {
  CJ_LOGISTICS = 'CJ_LOGISTICS',
  POST_OFFICE = 'POST_OFFICE',
  HANJIN = 'HANJIN',
  LOTTE = 'LOTTE',
  LOGEN = 'LOGEN',
}

/** 판매자 신청 상태. 표시명은 shared/lib/sellerApplicationState.ts */
export enum SellerApplicationStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** 배송지 지역 그룹. 도서산간이 아니면 GENERAL. 값은 서버 region_group 테이블 */
export type RegionGroup =
  | 'GENERAL'
  | 'JEJU_MAIN'
  | 'JEJU_ISLANDS'
  | 'ULLEUNG'
  | 'WEST_SEA_ISLANDS'
  | 'ETC_ISLANDS'
  | 'MOUNTAIN'

// ─── 공통 ────────────────────────────────────────────────

export type ProblemDetail = {
  type: string // 기본 "about:blank"
  title: string // 기본 HTTP 상태 문구 (PROBLEM_BASE_URI 설정 시 오류 코드 이름)
  status: number // 분기용
  detail: string // 사용자에게 보여줄 메시지
  instance: string
  errors?: { detail: string; pointer: string; path: string }[] // 422 검증 실패일 때만
}

/** 페이지 응답. 모든 목록 API가 같은 모양이다 */
export type PageResponse<T> = {
  content: T[]
  page: number // 0부터
  size: number
  totalElements: number
  totalPages: number
}

export type ProductPage<T> = PageResponse<T>
export type PayoutPage<T> = PageResponse<T>

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

/** 로그인·재발급 응답. access 30분. refresh는 한 번만 쓸 수 있어 재발급 뒤 둘 다 바꿔 저장한다 */
export type TokenResponse = {
  tokenType: 'Bearer'
  accessToken: string
  accessTokenExpiresAt: string // UTC, Z
  refreshToken: string
  refreshTokenExpiresAt: string // UTC, Z
}

export type LoginResponse = TokenResponse

export type TokenReissueRequest = { refreshToken: string }

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

// ─── 판매자 상점 (구매자가 보는 쪽, 계획 API) ─────────────

// TODO(api): 📝 GET /sellers/{sellerId} 없음. 구매자 화면(상품 상세·농가·찜) fixtures 전용 임시 타입.
// 상품 목록·상세에도 판매자 정보가 없어 화면이 따로 받는다(DECISIONS.md A-2). 판매자 본인 프로필은 아래 SellerProfileResponse.
export type SellerProfile = {
  sellerId: number
  storeName: string
  representativeName: string
  region: ProductRegion | null
  introduction: string | null // 200자 이하
  customerServicePhone: string | null
  profileImageUrl: string | null
  followerCount: number
  suspended: boolean // 판매 중지(정지)된 판매자. API 미정(C-9)
}

// ─── 상품 (판매자, Bearer SELLER) ─────────────────────────

/** 내 상품 목록 항목 GET /sellers/me/products. 숨긴 상품도 나오고 삭제한 상품만 빠진다 */
export type SellerProductSummary = ProductSummary & {
  visibility: ProductVisibility
  availableStock: number // 삭제되지 않은 옵션의 총재고 − 배정 수량
  createdAt: string
  updatedAt: string
}

export type SellerProductListParams = {
  status?: ProductStatus
  visibility?: ProductVisibility
  page?: number
  size?: number // 1~100
}

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

// ─── 지갑 잔액·충전·내역 ─────────────────────────────────

/** GET /wallets/me/balance. 지갑이 없으면 balance 0. 충전 가능 금액 = maxBalance − balance */
export type BuyerBalance = { balance: number; maxBalance: number }

/** POST /wallets/me/charges. 10,000원 이상 10,000원 단위, 충전 뒤 잔액 ≤ maxBalance */
export type WalletChargeRequest = { amount: number }

/** 201. chargeNo를 토스 결제창의 orderId로 넘긴다 */
export type WalletChargeResponse = { chargeNo: string; amount: number }

export type ChargeStatusResponse = { chargeNo: string; status: ChargeStatus; amount: number }

/** POST /wallets/me/charges/confirm. successUrl 쿼리의 orderId·paymentKey·amount */
export type ChargeConfirmRequest = { chargeNo: string; paymentKey: string; amount: number }

/** POST /wallets/me/charges/fail. failUrl 쿼리의 orderId·code·message */
export type ChargeFailRequest = { chargeNo: string; code: string; message?: string }

/** 이용 내역 한 줄. amount는 항상 양수(충전 +, 결제 −로 표시) */
export type LedgerEntry = {
  occurredAt: string
  type: LedgerType
  orderId: number | null // 결제일 때만
  amount: number
  balanceAfter: number
}

/** GET /wallets/me/ledgers. from·to는 yyyy-MM-dd(둘 다 포함). size 1~50, 기본 10 */
export type LedgerParams = {
  from?: string
  to?: string
  type?: LedgerType
  page?: number
  size?: number
}

/** GET /wallets/sellers/me/balance (SELLER). 승인 뒤 만들어지며 없으면 0 */
export type SellerBalanceResponse = { balance: number }

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
  shippingFee: number // 판매자 묶음 기본 배송비. 도서산간 추가 운임은 빠져 있다
  items: CheckoutItem[]
}

export type Checkout = {
  sellerGroups: CheckoutSellerGroup[]
  totalProductAmount: number
  totalShippingFee: number
  totalAmount: number // 도서산간 운임 제외 → 견적(fee-quotes)의 regionSurcharge를 더해 expectedTotalAmount로 보낸다
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

/** 내 주문 목록 한 줄 GET /orders (최신순). size 1~50, 기본 10 */
export type OrderSummary = {
  orderId: number
  status: OrderStatus
  orderedAt: string
  representativeProductName: string
  itemCount: number // 주문 상품 종류 수
  totalAmount: number
}

export type OrderListParams = { page?: number; size?: number }

/** 주문 상품 (주문 시점 값) */
export type OrderDetailItem = {
  orderItemId: number // 리뷰 작성에 쓴다
  productId: number
  productOptionId: number
  productName: string
  productOptionName: string
  unitPrice: number
  quantity: number
  itemAmount: number
  status: OrderItemStatus
}

export type OrderDetailSellerGroup = {
  sellerId: number
  shippingFee: number
  remoteAreaFee: number // 도서산간 추가 운임
  items: OrderDetailItem[]
}

/** 내 주문 상세 GET /orders/{orderId}. 다른 회원 주문은 404. shipmentId는 아직 안 내려준다 */
export type OrderDetail = {
  orderId: number
  status: OrderStatus
  orderedAt: string
  recipientName: string
  recipientPhone: string
  zipCode: string
  address: string
  addressDetail: string
  sellerGroups: OrderDetailSellerGroup[]
  totalProductAmount: number
  totalShippingFee: number
  totalRemoteAreaFee: number
  totalAmount: number
}

// ─── 배송 ────────────────────────────────────────────────

/** 배송비·도착 예정일 견적 요청 POST /shipments/fee-quotes (로그인 불필요). 판매자 1~100명, 중복 불가 */
export type ShippingFeeQuoteRequest = {
  postalCode: string // 숫자 5자리
  sellers: { sellerId: number; itemAmount: number }[] // 판매자별 상품 금액 합계
}

export type SellerShippingQuote = {
  sellerId: number
  baseShippingFee: number // 무료배송 기준 이상이면 0
  regionSurcharge: number // 도서산간 추가 운임. 무료배송이어도 붙는다
  shippingFee: number // baseShippingFee + regionSurcharge
  expectedShipDate: string // yyyy-MM-dd
  arrivalStartDate: string
  arrivalEndDate: string
}

export type ShippingFeeQuote = {
  regionGroup: RegionGroup
  sellers: SellerShippingQuote[] // 요청한 순서
  totalShippingFee: number
}

/** 배송지 (주문 생성 요청의 받는 사람·주소 부분). 주문서·주문 상세·계정 관리가 같이 쓴다 */
export type ShippingAddress = Pick<
  CreateOrderRequest,
  'recipientName' | 'recipientPhone' | 'zipCode' | 'address' | 'addressDetail'
>

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

// ─── 판매자 신청 ─────────────────────────────────────────

/** POST /sellers/me/applications (BUYER). businessNumber는 10자리 숫자 또는 000-00-00000 */
export type SellerApplyRequest = {
  storeName: string // 50자 이하
  representativeName: string // 50자 이하
  businessNumber: string
  mailOrderNumber: string // 통신판매업 신고번호, 50자 이하
}

export type SellerApplyResponse = { applicationId: number }

/** 내 신청 내역 한 건 GET /sellers/me/applications (최근 신청부터). 상태 enum은 shared/lib/sellerApplicationState */
export type SellerApplicationHistoryItem = {
  applicationId: number
  status: SellerApplicationStatus
  appliedAt: string
  reviewStartedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  rejectReason: string | null
}

export type SellerApplicationHistoryResponse = { applications: SellerApplicationHistoryItem[] }

/** 내 신청 한 건 GET /sellers/me/applications/{applicationId} */
export type SellerApplicationResponse = {
  applicationId: number
  status: SellerApplicationStatus
  storeName: string
  representativeName: string
  businessNumber: string
  appliedAt: string
}

/** 관리자 신청 목록 한 건 GET /admin/seller-applications (오래된 신청부터) */
export type SellerApplicationAdminSummary = {
  applicationId: number
  memberId: number
  storeName: string
  representativeName: string
  businessNumber: string
  status: SellerApplicationStatus
  appliedAt: string
}

/** 관리자 신청 상세. review/approve/reject도 처리 뒤 상세를 돌려준다 */
export type SellerApplicationAdminDetail = SellerApplicationAdminSummary & {
  mailOrderNumber: string
  reviewStartedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  rejectReason: string | null
  reviewerId: number | null // 승인·거절한 관리자 회원 번호
}

export type SellerApplicationRejectRequest = { reason: string } // 500자 이하

export type SellerApplicationListParams = {
  status?: SellerApplicationStatus
  page?: number
  size?: number // 1~100
}

// ─── 판매자 프로필 (Bearer SELLER) ───────────────────────

/** POST(등록)·PUT(전체 수정) /sellers/me/profile */
export type SellerProfileRequest = {
  storeName: string // 50자 이하
  representativeName: string // 50자 이하
  customerServicePhone: string // 0\d{1,2}-\d{3,4}-\d{4} 또는 1\d{3}-\d{4}
  introduction?: string | null // 200자 이하
  profileImageUrl?: string | null // POST /media/SELLER_PROFILE 응답 url. null이면 사진 삭제
}

export type SellerProfileResponse = {
  storeName: string
  representativeName: string
  customerServicePhone: string
  introduction: string | null
  profileImageUrl: string | null
}

// ─── 정산 (Bearer SELLER: /payouts/me, ADMIN: /admin/payouts) ──

export type PayoutSummary = {
  payoutId: number
  snapshotId: number
  payeeId: number | null // 시스템 몫이면 null
  system: boolean // 플랫폼 수수료 몫이면 true
  amount: number // 0 이하일 수 있음
  createdAt: string // 정산 확정 시각
}

/** 상세 공통. 판매자·관리자 모두 받는 필드 */
export type PayoutDetailCommon = PayoutSummary & {
  periodFrom: string | null // 포함. 첫 정산이면 null
  periodTo: string // 미포함
  itemCount: number
  sellerFeeAmount: number | null // 판매자 정산일 때만
  sellerFeeItemCount: number | null // 판매자 정산일 때만
}

/** 관리자 정산 상세 GET /admin/payouts/{payoutId} */
export type PayoutDetail = PayoutDetailCommon & {
  systemPayoutId: number | null // 판매자 정산이면 같은 스냅샷의 시스템 몫 정산 ID
}

/** 판매자 본인 정산 상세 GET /payouts/me/{payoutId}. system은 항상 false */
export type PayoutSellerDetail = PayoutDetailCommon

/** 항목 공통 */
export type PayoutItemCommon = {
  payoutItemId: number
  candidateId: number
  eventType: PayoutEventType
  orderId: number
  orderItemId: number | null // 배송비 항목은 null(판매자 묶음 배송 1건의 금액)
  sellerId: number
  amount: number // 조정 건이면 음수 가능
  candidateCreatedAt: string
}

/** 관리자 조정 정보. reason은 입력 원문 → 출력 시 이스케이프 */
export type PayoutAdjustment = { adjustmentId: number; adminId: number; reason: string }

/** 관리자 정산 항목 GET /admin/payouts/{payoutId}/items */
export type PayoutItem = PayoutItemCommon & { adjustment: PayoutAdjustment | null }

/** 판매자 정산 항목 GET /payouts/me/{payoutId}/items. 조정 건이면 사유만 */
export type PayoutSellerItem = PayoutItemCommon & { adjustment: { reason: string } | null }

/** 정산후보(구매확정으로 생긴 정산 대상) 공통 */
type PayoutCandidateCommon = {
  candidateId: number
  orderId: number
  orderItemId: number | null
  sellerId: number
  amount: number
  candidateCreatedAt: string // 평소 건은 구매확정 직후, 조정 건은 조정한 시각
  settled: boolean
  payoutId: number | null // 정산 전이면 null
}

/** 관리자 GET /admin/payouts/candidates */
export type PayoutCandidate = PayoutCandidateCommon & {
  eventType: PayoutEventType
  adjustment: PayoutAdjustment | null
}

/** 판매자 GET /payouts/me/candidates. 수수료(SALE_FEE) 후보는 안 나온다 */
export type PayoutSellerCandidate = PayoutCandidateCommon & {
  eventType: Exclude<PayoutEventType, PayoutEventType.SALE_FEE>
  adjustment: { reason: string } | null
}

/** POST /admin/payouts/run, /run/skip-wait */
export type PayoutRunResponse = { executionId: number; status: string }

/** POST /admin/payouts/adjustments (지금은 501) */
export type PayoutAdjustmentCreateRequest = {
  orderItemId: number
  eventType: PayoutEventType
  amount: number // 0 불가, 음수면 차감
  reason: string // 255자 이하
}

// from(포함)·to(미포함) 필수, "yyyy-MM-ddTHH:mm:ss", 최대 1년. size 1~100
export type SellerPayoutListParams = { from: string; to: string; page?: number; size?: number }

export type SellerPayoutCandidateParams = SellerPayoutListParams & { unsettledOnly?: boolean }

export type AdminPayoutListParams = SellerPayoutListParams & {
  payeeId?: number // 생략하면 전체
  system?: boolean // true 시스템 몫만, false 판매자 몫만
}

export type AdminPayoutCandidateParams = SellerPayoutCandidateParams & { sellerId?: number }
