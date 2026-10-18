import {
  OrderItemStatus,
  type PayoutDetail,
  PayoutEventType,
  type PayoutItem,
  type PayoutSummary,
  ProductCategory,
  ProductRegion,
  ProductStatus,
  ProductVisibility,
  type SellerProfile,
} from '@/shared/api/types'
import { ClaimState } from '@/shared/lib/claimState'
import { PAYOUT_FEE_RATE } from '@/shared/lib/constants'
import { WithdrawalState } from '@/shared/lib/withdrawalState'
import type { ProductFormValues } from './productSchema'
import type {
  CancelClaim,
  Follower,
  PayoutOutlook,
  SellerHomeStats,
  SellerOrderRow,
  SellerProductRow,
  SellerProductStats,
  SellerTodo,
  SellerWallet,
  SellerWalletTx,
  Withdrawal,
} from './types'
import { SellerWalletTxType } from './types'

// 1단계 샘플 데이터. 판매자 7 ‘청송 햇살농원’(김영수) 기준이다(products·farms·sellerApply fixtures와 같은 농가).
// 오늘 = 2026-10-18. 주문 20261018-0184는 구매자 주문 내역의 그 주문이다.

export const myStore: SellerProfile = {
  sellerId: 7,
  storeName: '청송 햇살농원',
  representativeName: '김영수',
  region: ProductRegion.GYEONGBUK,
  introduction: '3대째 사과만 키우는 청송 부남면 과수원이에요.',
  customerServicePhone: '054-873-2210',
  profileImageUrl: null,
  followerCount: 1284,
  suspended: false,
}

export const homeAsOf = '2026-10-18T15:00:00'

export const homeStats: SellerHomeStats = {
  newOrders: 3,
  waitingShipment: 5,
  cancelRequests: 2,
  expectedPayout: 412560,
}

export const todos: SellerTodo[] = [
  {
    orderItemId: 1841,
    orderNumber: '20261018-0184',
    orderedAt: '2026-10-18T14:30:00',
    buyerNickname: '주말장보기',
    itemText: '청송 꿀사과 부사 2kg (11~13과) × 1',
    cancelRequested: false,
    addressChangeRequested: false,
  },
  {
    orderItemId: 1781,
    orderNumber: '20261018-0178',
    orderedAt: '2026-10-18T11:02:00',
    buyerNickname: '사과먹는곰',
    itemText: '청송 꿀사과 부사 3kg (16~18과) × 1',
    cancelRequested: true,
    addressChangeRequested: false,
  },
  {
    orderItemId: 1701,
    orderNumber: '20261018-0170',
    orderedAt: '2026-10-18T09:15:00',
    buyerNickname: '아침사과',
    itemText: '청송 꿀사과 부사 1kg (5~6과) × 2',
    cancelRequested: false,
    addressChangeRequested: true,
  },
  {
    orderItemId: 1681,
    orderNumber: '20261017-0168',
    orderedAt: '2026-10-17T21:40:00',
    buyerNickname: '둘이서한끼',
    itemText: '청송 사과즙 100% (30포) × 1',
    cancelRequested: false,
    addressChangeRequested: false,
  },
  {
    orderItemId: 1491,
    orderNumber: '20261017-0149',
    orderedAt: '2026-10-17T18:05:00',
    buyerNickname: '망원동카페',
    itemText: '청송 꿀사과 부사 3kg (16~18과) × 2',
    cancelRequested: true,
    addressChangeRequested: false,
  },
]

export const sellerWalletBalance = 1086420

export const productStats: SellerProductStats = { onSale: 2, ready: 1, lowStockOptions: 1 }

export const followers: Follower[] = [
  '주말장보기',
  '사과먹는곰',
  '둘이서한끼',
  '아침사과',
  '망원동카페',
  '초록식탁',
  '귤보다사과',
  '오늘도과일',
  '부산사과러',
  '연남동부엌',
].map((nickname, i) => ({ memberId: 100 + i, nickname }))

// ─── 상품 관리 (판매 중 2 · 판매 준비 1 · 판매 종료 1, 센터 홈 상품 현황과 같다) ───

export const sellerProducts: SellerProductRow[] = [
  {
    productId: 101,
    name: '청송 꿀사과 부사',
    thumbnailUrl: '',
    optionCount: 3,
    totalStock: 35,
    status: ProductStatus.ON_SALE,
    visibility: ProductVisibility.VISIBLE,
    updatedAt: '2026-10-12T18:20:00',
    hasLowStock: true,
  },
  {
    productId: 106,
    name: '청송 사과즙 100% (30포)',
    thumbnailUrl: '',
    optionCount: 1,
    totalStock: 120,
    status: ProductStatus.ON_SALE,
    visibility: ProductVisibility.VISIBLE,
    updatedAt: '2026-10-10T09:00:00',
    hasLowStock: false,
  },
  {
    productId: 109,
    name: '청송 꿀사과 부사 (흠과·가정용)',
    thumbnailUrl: '',
    optionCount: 2,
    totalStock: 40,
    status: ProductStatus.READY,
    visibility: ProductVisibility.HIDDEN,
    updatedAt: '2026-10-18T10:05:00',
    hasLowStock: false,
  },
  {
    productId: 110,
    name: '청송 홍로 사과',
    thumbnailUrl: '',
    optionCount: 2,
    totalStock: 0,
    status: ProductStatus.ENDED,
    visibility: ProductVisibility.VISIBLE,
    updatedAt: '2026-09-28T09:12:00',
    hasLowStock: false,
  },
]

/** 상품 수정 처음 값 (101) — 판매자 본인 상품 상세 API가 없어 fixtures (bruno README ‘남은 이슈’: version을 받을 곳이 없음) */
export const appleFormValues: ProductFormValues = {
  category: ProductCategory.FRUIT,
  name: '청송 꿀사과 부사',
  region: ProductRegion.GYEONGBUK,
  description:
    '3대째 사과만 키우는 청송 부남면 과수원이에요. 10월 8일에 수확한 부사를 크기별로 골라 상자에 담아 보내 드려요.\n\n받으신 뒤 바로 냉장 보관하면 더 오래 아삭하게 드실 수 있어요.',
  options: [
    { id: 1011, name: '1kg (5~6과)', salePrice: 12900, listPrice: 14500, totalStock: 20 },
    { id: 1012, name: '2kg (11~13과)', salePrice: 23900, listPrice: 27000, totalStock: 11 },
    { id: 1013, name: '3kg (16~18과)', salePrice: 33900, listPrice: 38000, totalStock: 4 },
  ],
  status: ProductStatus.ON_SALE,
  visibility: ProductVisibility.VISIBLE,
}

// ─── 주문·출고 (출고 대기 5건은 센터 홈 ‘오늘 처리할 일’과 같다) ───

const order = (
  row: Omit<
    SellerOrderRow,
    'addressChange' | 'delay' | 'carrier' | 'trackingNumber' | 'cancelRequested'
  > &
    Partial<SellerOrderRow>,
): SellerOrderRow => ({
  cancelRequested: false,
  addressChange: null,
  delay: null,
  carrier: null,
  trackingNumber: null,
  ...row,
})

export const sellerOrders: SellerOrderRow[] = [
  order({
    shipmentId: 1,
    orderNumber: '20261018-0184',
    orderedAt: '2026-10-18T14:30:00',
    buyerNickname: '주말장보기',
    productName: '청송 꿀사과 부사',
    itemText: '2kg (11~13과) × 1',
    address: '서울 중구 세종대로 110, 3층 301호',
    amount: 23900,
    status: OrderItemStatus.PREPARING,
  }),
  order({
    shipmentId: 11,
    orderNumber: '20261018-0178',
    orderedAt: '2026-10-18T11:02:00',
    buyerNickname: '사과먹는곰',
    productName: '청송 꿀사과 부사',
    itemText: '3kg (16~18과) × 1',
    address: '경기 성남시 분당구 판교역로 235',
    amount: 33900,
    status: OrderItemStatus.PREPARING,
    cancelRequested: true,
  }),
  order({
    shipmentId: 12,
    orderNumber: '20261018-0170',
    orderedAt: '2026-10-18T09:15:00',
    buyerNickname: '아침사과',
    productName: '청송 꿀사과 부사',
    itemText: '1kg (5~6과) × 2',
    address: '서울 마포구 월드컵북로 21, 302호',
    amount: 25800,
    status: OrderItemStatus.PREPARING,
    addressChange: { after: '서울 마포구 성미산로 17, 1층', requestedAt: '2026-10-18T10:12:00' },
  }),
  order({
    shipmentId: 13,
    orderNumber: '20261017-0168',
    orderedAt: '2026-10-17T21:40:00',
    buyerNickname: '둘이서한끼',
    productName: '청송 사과즙 100% (30포)',
    itemText: '120ml × 30포 × 1',
    address: '부산 해운대구 센텀중앙로 79',
    amount: 29900,
    status: OrderItemStatus.PREPARING,
    delay: { reason: '수확 지연', newShipDate: '2026-10-21T00:00:00' },
  }),
  order({
    shipmentId: 14,
    orderNumber: '20261017-0149',
    orderedAt: '2026-10-17T18:05:00',
    buyerNickname: '망원동카페',
    productName: '청송 꿀사과 부사',
    itemText: '3kg (16~18과) × 2',
    address: '서울 마포구 망원로 54',
    amount: 67800,
    status: OrderItemStatus.PREPARING,
    cancelRequested: true,
  }),
  order({
    shipmentId: 15,
    orderNumber: '20261016-0131',
    orderedAt: '2026-10-16T08:20:00',
    buyerNickname: '초록식탁',
    productName: '청송 꿀사과 부사',
    itemText: '2kg (11~13과) × 1',
    address: '대전 유성구 대학로 99',
    amount: 23900,
    status: OrderItemStatus.SHIPPING,
    carrier: 'CJ대한통운',
    trackingNumber: '684219375520',
  }),
  order({
    shipmentId: 16,
    orderNumber: '20261015-0122',
    orderedAt: '2026-10-15T19:45:00',
    buyerNickname: '귤보다사과',
    productName: '청송 사과즙 100% (30포)',
    itemText: '120ml × 30포 × 2',
    address: '광주 서구 상무중앙로 7',
    amount: 59800,
    status: OrderItemStatus.SHIPPING,
    carrier: '우체국택배',
    trackingNumber: '6070123456789',
    note: '10.17 승인한 배송지로 보냈어요',
  }),
  order({
    shipmentId: 6,
    orderNumber: '20261006-0027',
    orderedAt: '2026-10-06T08:20:00',
    buyerNickname: '주말장보기',
    productName: '청송 사과즙 100% (30포)',
    itemText: '120ml × 30포 × 1',
    address: '서울 중구 세종대로 110, 3층 301호',
    amount: 29900,
    status: OrderItemStatus.DELIVERED,
    carrier: 'CJ대한통운',
    trackingNumber: '684219371180',
  }),
  order({
    shipmentId: 17,
    orderNumber: '20261014-0101',
    orderedAt: '2026-10-14T13:00:00',
    buyerNickname: '오늘도과일',
    productName: '청송 꿀사과 부사',
    itemText: '1kg (5~6과) × 1',
    address: '인천 연수구 컨벤시아대로 165',
    amount: 12900,
    status: OrderItemStatus.CANCELED,
    note: '10.14 판매자 취소 · 품절',
  }),
]

// ─── 취소 요청 ───────────────────────────────────────────

export const cancelClaims: CancelClaim[] = [
  {
    claimId: 31,
    state: ClaimState.CLAIM_PENDING,
    requestedAt: '2026-10-18T11:40:00',
    orderNumber: '20261018-0178',
    buyerNickname: '사과먹는곰',
    itemText: '청송 꿀사과 부사 3kg (16~18과) × 1',
    reason: '주문 실수 (옵션·수량)',
    amount: 33900,
    shippingFee: 0,
    rejectReason: null,
  },
  {
    claimId: 30,
    state: ClaimState.CLAIM_PENDING,
    requestedAt: '2026-10-17T20:10:00',
    orderNumber: '20261017-0149',
    buyerNickname: '망원동카페',
    itemText: '청송 꿀사과 부사 3kg (16~18과) × 2',
    reason: '다른 상품으로 다시 주문',
    amount: 67800,
    shippingFee: 0,
    rejectReason: null,
  },
  {
    claimId: 22,
    state: ClaimState.CLAIM_APPROVED,
    requestedAt: '2026-10-12T09:00:00',
    orderNumber: '20261011-0088',
    buyerNickname: '부산사과러',
    itemText: '청송 꿀사과 부사 1kg (5~6과) × 1',
    reason: '배송지 문제',
    amount: 12900,
    shippingFee: 0,
    rejectReason: null,
  },
  {
    claimId: 21,
    state: ClaimState.CLAIM_REJECTED,
    requestedAt: '2026-10-10T16:30:00',
    orderNumber: '20261010-0071',
    buyerNickname: '연남동부엌',
    itemText: '청송 사과즙 100% (30포) × 1',
    reason: '주문 실수 (옵션·수량)',
    amount: 29900,
    shippingFee: 0,
    rejectReason: '이미 포장을 마쳐 오늘 출고했어요',
  },
]

// ─── 정산 ────────────────────────────────────────────────
// 매일 02:00 정산. 정산 금액 = 판매 대금 − 수수료 3% + 배송비. 아래 4건의 합이 지갑 입금 내역과 같다.
// TODO(api): SALE_FEE 금액의 부호(양수로 내려오는지)는 서버 응답으로 확인. 화면은 부호와 상관없이 차감으로 보여 준다.

type SaleLine = { orderItemId: number; price: number; shipping: number }

const feeOf = (price: number) => Math.round((price * PAYOUT_FEE_RATE) / 100)

const payoutSets: {
  payoutId: number
  createdAt: string
  periodFrom: string | null
  lines: SaleLine[]
}[] = [
  {
    payoutId: 1021,
    createdAt: '2026-10-18T02:00:00',
    periodFrom: '2026-10-17T02:00:00',
    lines: [
      { orderItemId: 1210, price: 23900, shipping: 3000 },
      { orderItemId: 1227, price: 23900, shipping: 3000 },
      { orderItemId: 1140, price: 33900, shipping: 3000 },
      { orderItemId: 1118, price: 12900, shipping: 3000 },
    ],
  },
  {
    payoutId: 1019,
    createdAt: '2026-10-17T02:00:00',
    periodFrom: '2026-10-16T02:00:00',
    lines: [
      { orderItemId: 1093, price: 23900, shipping: 3000 },
      { orderItemId: 1051, price: 67800, shipping: 0 },
      { orderItemId: 1002, price: 12900, shipping: 3000 },
    ],
  },
  {
    payoutId: 1016,
    createdAt: '2026-10-16T02:00:00',
    periodFrom: '2026-10-15T02:00:00',
    lines: [
      { orderItemId: 944, price: 25800, shipping: 3000 },
      { orderItemId: 937, price: 23900, shipping: 3000 },
    ],
  },
  {
    payoutId: 1011,
    createdAt: '2026-10-15T02:00:00',
    periodFrom: null,
    lines: [
      { orderItemId: 888, price: 33900, shipping: 3000 },
      { orderItemId: 831, price: 23900, shipping: 3000 },
      { orderItemId: 829, price: 23900, shipping: 3000 },
    ],
  },
]

const totalOf = (lines: SaleLine[]) =>
  lines.reduce((sum, l) => sum + l.price - feeOf(l.price) + l.shipping, 0)

export const payouts: PayoutSummary[] = payoutSets.map((set) => ({
  payoutId: set.payoutId,
  snapshotId: set.payoutId + 5000,
  payeeId: myStore.sellerId,
  system: false,
  amount: totalOf(set.lines),
  createdAt: set.createdAt,
}))

export const payoutDetails: PayoutDetail[] = payoutSets.map((set, index) => ({
  ...(payouts[index] as PayoutSummary),
  periodFrom: set.periodFrom,
  periodTo: set.createdAt,
  itemCount: set.lines.filter((l) => l.shipping > 0).length + set.lines.length * 2,
  systemPayoutId: null,
  sellerFeeAmount: set.lines.reduce((sum, l) => sum + feeOf(l.price), 0),
  sellerFeeItemCount: set.lines.length,
}))

/** payoutId → 정산 항목. 배송비 0원은 항목이 없다 */
export const payoutItems: Record<number, PayoutItem[]> = Object.fromEntries(
  payoutSets.map((set) => {
    let id = set.payoutId * 100
    const item = (line: SaleLine, eventType: PayoutEventType, amount: number): PayoutItem => ({
      payoutItemId: ++id,
      candidateId: id + 30000,
      eventType,
      orderItemId: line.orderItemId,
      sellerId: myStore.sellerId,
      amount,
      candidateCreatedAt: '2026-10-01T02:00:00',
      adjustment: null,
    })
    return [
      set.payoutId,
      set.lines.flatMap((line) => [
        item(line, PayoutEventType.SALE_AMOUNT, line.price),
        item(line, PayoutEventType.SALE_FEE, feeOf(line.price)),
        ...(line.shipping > 0
          ? [item(line, PayoutEventType.SALE_SHIPPING_FEE, line.shipping)]
          : []),
      ]),
    ]
  }),
)

/** 관리자 정산 조정이 들어간 정산 (미리보기용): 1016에 −3,000원 */
export const adjustedPayoutDetail: PayoutDetail = {
  ...(payoutDetails[2] as PayoutDetail),
  amount: (payoutDetails[2] as PayoutDetail).amount - 3000,
  itemCount: (payoutDetails[2] as PayoutDetail).itemCount + 1,
}

export const adjustedPayoutItems: PayoutItem[] = [
  ...(payoutItems[1016] ?? []),
  {
    payoutItemId: 101699,
    candidateId: 39999,
    eventType: PayoutEventType.SALE_AMOUNT,
    orderItemId: 937,
    sellerId: myStore.sellerId,
    amount: -3000,
    candidateCreatedAt: '2026-10-15T10:20:00',
    adjustment: {
      adjustmentId: null,
      adminId: null,
      reason: '배송 중 파손으로 구매자에게 일부 환불한 금액이에요',
    },
  },
]

// TODO(api): 정산 예정 금액·다음 정산 예정일 API 없음 → 센터 홈과 같은 값
export const payoutOutlook: PayoutOutlook = {
  expectedAmount: homeStats.expectedPayout,
  nextPayoutDate: '2026-10-19T02:00:00',
}

// ─── 지갑·출금 ───────────────────────────────────────────
// 잔액 = 센터 홈의 sellerWalletBalance. 처리 중 출금 200,000원은 출금 가능 금액에서 뺀다.

export const sellerWallet: SellerWallet = {
  balance: sellerWalletBalance,
  withdrawableAmount: sellerWalletBalance - 200000,
  account: { bankName: '농협은행', accountNumberMasked: '301-••••-5521', holder: '김영수' },
  accountNeedsCheck: false,
  accountChangePending: false,
}

export const withdrawals: Withdrawal[] = [
  {
    withdrawalId: 52,
    amount: 200000,
    state: WithdrawalState.PROCESSING,
    requestedAt: '2026-10-18T10:05:00',
    completedAt: null,
    failReason: null,
  },
  {
    withdrawalId: 48,
    amount: 500000,
    state: WithdrawalState.COMPLETED,
    requestedAt: '2026-10-14T14:20:00',
    completedAt: '2026-10-14T16:40:00',
    failReason: null,
  },
  {
    withdrawalId: 41,
    amount: 300000,
    state: WithdrawalState.FAILED,
    requestedAt: '2026-10-07T11:00:00',
    completedAt: null,
    failReason: '은행 점검 시간이라 보내지 못했어요',
  },
]

const payoutTx = (index: number, id: number): SellerWalletTx => {
  const payout = payouts[index] as PayoutSummary
  const detail = payoutDetails[index] as PayoutDetail
  return {
    transactionId: id,
    type: SellerWalletTxType.PAYOUT,
    description: `정산 입금 · 정산번호 ${payout.payoutId} · ${detail.sellerFeeItemCount}건`,
    amount: payout.amount,
    balanceAfter: 0,
    occurredAt: payout.createdAt,
  }
}

/** 최신순. 거래 후 잔액은 지금 잔액에서 거꾸로 계산한다 */
export const sellerWalletTxs: SellerWalletTx[] = (() => {
  const rows: SellerWalletTx[] = [
    payoutTx(0, 908),
    payoutTx(1, 905),
    payoutTx(2, 903),
    payoutTx(3, 901),
    {
      transactionId: 899,
      type: SellerWalletTxType.WITHDRAWAL,
      description: '출금 · 농협은행 계좌',
      amount: -500000,
      balanceAfter: 0,
      occurredAt: '2026-10-14T16:40:00',
    },
  ]
  // 처리 중인 출금은 아직 잔액에서 빠지지 않았다(출금 가능 금액에서만 뺀다)
  let balance = sellerWalletBalance
  return rows.map((row) => {
    const next = { ...row, balanceAfter: balance }
    balance -= row.amount
    return next
  })
})()
