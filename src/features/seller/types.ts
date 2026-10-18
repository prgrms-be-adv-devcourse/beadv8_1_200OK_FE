import type { OrderItemStatus, ProductStatus, ProductVisibility } from '@/shared/api/types'
import type { ClaimState } from '@/shared/lib/claimState'
import type { WithdrawalState } from '@/shared/lib/withdrawalState'

// 판매자 센터 화면 전용 타입. TODO(api): 센터 홈 집계 API는 없다(❌). 필드는 시안 기준 임시.

export type SellerHomeStats = {
  /** 오늘 들어온 주문 */
  newOrders: number
  /** 송장 등록이 필요한 주문 */
  waitingShipment: number
  /** 처리 안 한 취소 요청 */
  cancelRequests: number
  /** 구매확정된 주문 기준 정산 예정 금액 */
  expectedPayout: number
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

export type SellerProductStats = { onSale: number; ready: number; lowStockOptions: number }

/** 📝 GET /sellers/me/followers — 팔로워는 닉네임만 보여 준다 */
export type Follower = { memberId: number; nickname: string }

// ─── 상품 관리 ───────────────────────────────────────────
// TODO(api): 판매자 본인 상품 목록 API 없음(❌). 등록·수정·상태·노출·삭제는 ✅(임시 헤더)

export type SellerProductRow = {
  productId: number
  name: string
  thumbnailUrl: string
  optionCount: number
  totalStock: number
  status: ProductStatus
  visibility: ProductVisibility
  updatedAt: string
  /** 재고 적은 옵션이 있음 (LOW_STOCK_THRESHOLD 이하) */
  hasLowStock: boolean
}

// ─── 주문·출고 ───────────────────────────────────────────
// TODO(api): 판매자 주문 목록 API 없음(❌). 송장·지연·판매자 취소는 📝

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
  carrier: string | null
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
// TODO(api): 📝 GET /claims/seller, 승인·거절

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
// 목록·상세·항목은 ✅(shared/api/types의 Payout*). 아래 요약 두 값만 API가 없다.

/** TODO(api): 정산 예정 금액·다음 정산 예정일 API 없음(❌). 시안 기준 임시 */
export type PayoutOutlook = {
  /** 구매확정됐고 아직 정산 전인 금액 */
  expectedAmount: number
  /** 다음 정산 배치 날짜 (C-12) */
  nextPayoutDate: string
}

// ─── 지갑·출금 ───────────────────────────────────────────
// TODO(api): 📝 GET /wallets/seller, .../transactions, POST .../withdrawals, GET .../withdrawals/{id} · ❌ 계좌 변경.
//   필드는 시안 기준 임시.

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
  account: PayoutAccount
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
