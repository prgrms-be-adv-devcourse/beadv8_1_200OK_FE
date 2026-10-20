import type {
  OrderItemStatus,
  ProductStatus,
  ProductVisibility,
  ShipmentCarrier,
} from '@/shared/api/types'
import type { ClaimState } from '@/shared/lib/claimState'
import type { WithdrawalState } from '@/shared/lib/withdrawalState'

// 판매자 센터 화면 전용 타입. TODO(api): ❌ 센터 홈 주문 집계 API 없음 → 화면엔 연결 전(–). 주문 쪽 필드는 시안 기준 임시.

/** 오늘 요약 주문 집계. 정산 예정 금액은 ✅ 정산 후보 합계(PayoutOutlook)로 따로 받는다 */
export type SellerHomeStats = {
  /** 오늘 들어온 주문 */
  newOrders: number
  /** 송장 등록이 필요한 주문 */
  waitingShipment: number
  /** 처리 안 한 취소 요청 */
  cancelRequests: number
}

/** 오늘 처리할 일 한 줄 (출고 대기 주문 상품) */
export type SellerTodo = {
  orderItemId: number
  orderNumber: string
  orderedAt: string
  buyerNickname: string
  itemText: string // 예: 청송 꿀사과 부사 2kg × 1
  cancelRequested: boolean
  addressChangeRequested: boolean
}

/** ✅ 내 상품 목록에서 센다. lowStockProducts = 판매 가능 수량이 LOW_STOCK_THRESHOLD 이하인 상품 수 */
export type SellerProductStats = { onSale: number; ready: number; lowStockProducts: number }

/** TODO(api): ❌ 팔로워 API 없음 → 화면엔 연결 전. 팔로워는 닉네임만 보여 준다 */
export type Follower = { memberId: number; nickname: string }

// ─── 상품 관리 ───────────────────────────────────────────
// ✅ 목록 GET /sellers/me/products, 등록·수정·상태·노출·삭제. 한 줄 = SellerProductSummary

export type SellerProductRow = {
  productId: number
  name: string
  thumbnailUrl: string
  /** 옵션 중 최저 판매가 */
  minSalePrice: number
  /** 판매 가능 수량 (총재고 − 배정 수량) */
  availableStock: number
  soldOut: boolean
  status: ProductStatus
  visibility: ProductVisibility
  updatedAt: string
  /** 판매 가능 수량이 LOW_STOCK_THRESHOLD 이하 */
  hasLowStock: boolean
}

// ─── 주문·출고 ───────────────────────────────────────────
// ✅ 출고(송장) POST /seller/shipments/{id}/dispatch · 배송지 변경 승인·거절 PATCH. TODO(api): ❌ 판매자 주문 목록 API 없음(shipmentId를 받을 곳이 없어 연결 보류), ❌ 지연·판매자 취소

/** 한 줄 = 한 주문에서 이 농가로 온 배송 묶음 */
export type SellerOrderRow = {
  shipmentId: number
  orderNumber: string
  orderedAt: string
  buyerNickname: string
  productName: string
  itemText: string // 옵션 × 수량
  address: string
  amount: number
  status: OrderItemStatus
  cancelRequested: boolean
  addressChange: { after: string; requestedAt: string } | null
  delay: { reason: string; newShipDate: string } | null
  carrier: ShipmentCarrier | null
  trackingNumber: string | null
  /** 처리 결과 한 줄 (예: 10.13 승인된 배송지로 보내요) */
  note?: string
}

export enum SellerOrderTab {
  WAITING = 'WAITING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
}

export enum DelayReason {
  HARVEST = 'HARVEST',
  WEATHER = 'WEATHER',
  SCHEDULE = 'SCHEDULE',
  ETC = 'ETC',
}

export enum SellerCancelReason {
  SOLD_OUT = 'SOLD_OUT',
  BAD_HARVEST = 'BAD_HARVEST',
  ETC = 'ETC',
}

// ─── 취소 요청 ───────────────────────────────────────────
// TODO(api): ❌ 판매자 클레임(취소 요청) 목록·승인·거절 API 없음 → 화면은 연결 전, 이 타입은 미리보기용

export type CancelClaim = {
  claimId: number
  state: ClaimState
  requestedAt: string
  orderNumber: string
  buyerNickname: string
  itemText: string
  reason: string
  amount: number
  shippingFee: number
  rejectReason: string | null
}

// ─── 정산 ────────────────────────────────────────────────
// 목록·상세·항목·후보는 ✅(shared/api/types의 Payout*, /payouts/me).

/** ✅ 정산 예정 = 미정산 후보(GET /payouts/me/candidates?unsettledOnly=true) 합계. 다음 정산일은 정책 상수(PAYOUT_RUN_HOUR) */
export type PayoutOutlook = {
  /** 구매확정됐고 아직 정산 전인 금액 */
  expectedAmount: number
  /** 아직 정산 전인 후보 건수 */
  pendingCount: number
  /** 후보가 한 페이지(100건)를 넘어 합계가 일부만인지 */
  truncated: boolean
  /** 다음 정산 배치 시각 (C-12) */
  nextPayoutDate: string
}

// ─── 지갑·출금 ───────────────────────────────────────────
// ✅ 잔액 GET /wallets/sellers/me/balance. TODO(api): ❌ 출금·입출금 내역·계좌(등록·변경) API 없음 → 화면엔 연결 전, 타입은 시안 기준 임시.

export type PayoutAccount = {
  bankName: string
  /** 서버가 가려서 준다고 가정: 301-0••••-5521 */
  accountNumberMasked: string
  holder: string
}

export type SellerWallet = {
  balance: number
  /** 잔액 − 처리 중인 출금 */
  withdrawableAmount: number
  /** null = 연결 전. TODO(api): ❌ 정산 계좌 조회 API 없음 */
  account: PayoutAccount | null
  /** 은행이 예금주·계좌번호가 맞지 않다고 알려 옴 → 출금 막음 */
  accountNeedsCheck: boolean
  /** 계좌 변경 요청을 보냈고 관리자가 아직 확인 안 함 (C-6) */
  accountChangePending: boolean
}

export type Withdrawal = {
  withdrawalId: number
  amount: number
  state: WithdrawalState
  requestedAt: string
  /** 완료 시각 */
  completedAt: string | null
  /** 실패 이유 (실패면 잔액으로 돌려놓는다) */
  failReason: string | null
}

export enum SellerWalletTxType {
  PAYOUT = 'PAYOUT',
  WITHDRAWAL = 'WITHDRAWAL',
  WITHDRAWAL_RETURN = 'WITHDRAWAL_RETURN',
}

export type SellerWalletTx = {
  transactionId: number
  type: SellerWalletTxType
  description: string
  /** 들어오면 +, 나가면 − */
  amount: number
  balanceAfter: number
  occurredAt: string
}
