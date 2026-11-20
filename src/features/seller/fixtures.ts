import { type Refund, RefundStatus } from '@/shared/api/refund'
import {
  PayoutEventType,
  type PayoutSellerCandidate,
  type PayoutSellerDetail,
  type PayoutSellerItem,
  type PayoutSummary,
  ProductCategory,
  ProductCategoryGroup,
  ProductRegion,
  ProductStatus,
  ProductVisibility,
  ReviewAspect,
  type ReviewSentimentSummary,
  type SellerProductDetail,
  type SellerProductSummary,
  type SellerProfile,
  type SellerProfileResponse,
  type SellerShipmentSummary,
  type SentimentCounts,
  ShipmentCarrier,
  type ShipmentDetail,
  ShipmentStatus,
} from '@/shared/api/types'
import { LOW_STOCK_THRESHOLD, PAYOUT_FEE_RATE } from '@/shared/lib/constants'
import { WithdrawalState } from '@/shared/lib/withdrawalState'
import type { ProductFormValues } from './productSchema'
import { type ReviewOverview, summarizeSellerSentiments } from './reviewOverview'
import type {
  Follower,
  PayoutOutlook,
  SellerHomeStats,
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

/** ✅ GET /sellers/me/profile 응답 모양 */
export const myProfile: SellerProfileResponse = {
  storeName: '청송 햇살농원',
  representativeName: '김영수',
  customerServicePhone: '054-873-2210',
  originPostalCode: '37421',
  introduction: '3대째 사과만 키우는 청송 부남면 과수원이에요.',
  profileImageUrl: null,
}

/** 구매자 쪽(농가 화면)에서 보는 모양. TODO(api): 팔로워 수 API 없음(❌) */
export const myStore: SellerProfile = {
  sellerId: 7,
  ...myProfile,
  region: ProductRegion.GYEONGBUK,
  followerCount: 1284,
  suspended: false,
}

export const homeAsOf = '2026-10-18T15:00:00'

export const homeStats: SellerHomeStats = {
  newOrders: 3,
  waitingShipment: 5,
  cancelRequests: 2,
}

/** 센터 홈 정산 예정 금액 = 미정산 후보 합계(payoutOutlook.expectedAmount) */
const expectedPayout = 412560

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

export const productStats: SellerProductStats = { onSale: 2, ready: 1, lowStockProducts: 1 }

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
// ✅ GET /sellers/me/products 응답 모양.

const summary = (
  row: Pick<
    SellerProductSummary,
    'productId' | 'name' | 'minSalePrice' | 'status' | 'visibility' | 'availableStock' | 'updatedAt'
  > &
    Partial<SellerProductSummary>,
): SellerProductSummary => ({
  thumbnailUrl: '',
  minPriceListPrice: row.minSalePrice,
  discountRate: 0,
  category: ProductCategory.FRUIT,
  region: ProductRegion.GYEONGBUK,
  soldOut: row.availableStock === 0,
  reviewCount: 0,
  averageRating: 0,
  createdAt: row.updatedAt,
  ...row,
})

export const mySellerProducts: SellerProductSummary[] = [
  summary({
    productId: 101,
    name: '청송 꿀사과 부사',
    minSalePrice: 12900,
    minPriceListPrice: 14500,
    discountRate: 11,
    status: ProductStatus.ON_SALE,
    visibility: ProductVisibility.VISIBLE,
    availableStock: 4,
    reviewCount: 128,
    averageRating: 4.8,
    createdAt: '2026-09-01T09:00:00',
    updatedAt: '2026-10-12T18:20:00',
  }),
  summary({
    productId: 106,
    name: '청송 사과즙 100% (30포)',
    minSalePrice: 29900,
    category: ProductCategory.PROCESSED_AGRI,
    status: ProductStatus.ON_SALE,
    visibility: ProductVisibility.VISIBLE,
    availableStock: 120,
    reviewCount: 41,
    averageRating: 4.6,
    updatedAt: '2026-10-10T09:00:00',
  }),
  summary({
    productId: 109,
    name: '청송 꿀사과 부사 (흠과·가정용)',
    minSalePrice: 9900,
    status: ProductStatus.READY,
    visibility: ProductVisibility.HIDDEN,
    availableStock: 40,
    updatedAt: '2026-10-18T10:05:00',
  }),
  summary({
    productId: 110,
    name: '청송 홍로 사과',
    minSalePrice: 15900,
    status: ProductStatus.ENDED,
    visibility: ProductVisibility.VISIBLE,
    availableStock: 0,
    reviewCount: 12,
    averageRating: 4.4,
    updatedAt: '2026-09-28T09:12:00',
  }),
]

export const sellerProducts: SellerProductRow[] = mySellerProducts.map((p) => ({
  productId: p.productId,
  name: p.name,
  thumbnailUrl: p.thumbnailUrl,
  minSalePrice: p.minSalePrice,
  availableStock: p.availableStock,
  soldOut: p.soldOut,
  status: p.status,
  visibility: p.visibility,
  updatedAt: p.updatedAt,
  hasLowStock: p.availableStock <= LOW_STOCK_THRESHOLD,
}))

/** 상품 수정 처음 값 (101) — /__design 미리보기와 테스트용. allocatedQuantity는 주문에 배정된 수량 */
export const appleFormValues: ProductFormValues = {
  category: ProductCategory.FRUIT,
  name: '청송 꿀사과 부사',
  region: ProductRegion.GYEONGBUK,
  description:
    '<p>3대째 사과만 키우는 청송 부남면 과수원이에요. 10월 8일에 수확한 부사를 크기별로 골라 상자에 담아 보내 드려요.</p><h3>보관법</h3><ul><li><p>받으신 뒤 바로 냉장 보관하면 더 오래 아삭하게 드실 수 있어요.</p></li></ul>',
  options: [
    {
      id: 1011,
      name: '1kg (5~6과)',
      salePrice: 12900,
      listPrice: 14500,
      totalStock: 20,
      allocatedQuantity: 6,
    },
    {
      id: 1012,
      name: '2kg (11~13과)',
      salePrice: 23900,
      listPrice: 27000,
      totalStock: 11,
      allocatedQuantity: 3,
    },
    {
      id: 1013,
      name: '3kg (16~18과)',
      salePrice: 33900,
      listPrice: 38000,
      totalStock: 4,
      allocatedQuantity: 0,
    },
  ],
  status: ProductStatus.ON_SALE,
  visibility: ProductVisibility.VISIBLE,
}

/** ✅ GET /sellers/me/products/101 응답 모양 (수정 화면 상세). 목록 fixtures의 101과 같은 상품 */
export const sellerProductDetail101: SellerProductDetail = {
  productId: 101,
  version: 3,
  name: appleFormValues.name,
  descriptionHtml: appleFormValues.description,
  categoryGroup: ProductCategoryGroup.AGRICULTURE,
  category: appleFormValues.category,
  region: appleFormValues.region,
  status: ProductStatus.ON_SALE,
  visibility: ProductVisibility.VISIBLE,
  imageUrls: [],
  options: appleFormValues.options.map((o) => ({
    optionId: o.id as number,
    name: o.name,
    listPrice: o.listPrice ?? o.salePrice,
    salePrice: o.salePrice,
    totalStock: o.totalStock,
    allocatedQuantity: o.allocatedQuantity ?? 0,
    availableStock: o.totalStock - (o.allocatedQuantity ?? 0),
  })),
  createdAt: '2026-09-01T09:00:00',
  updatedAt: '2026-10-12T18:20:00',
}

/** ✅ GET /sellers/me/products/101/review-sentiments 응답 모양. 항목별 합은 mentionedReviewCount와 같다 */
export const reviewSentiments101: ReviewSentimentSummary = {
  analyzedReviewCount: 18,
  overall: { positive: 12, negative: 3, neutral: 2, mixed: 1 },
  aspects: [
    {
      aspect: ReviewAspect.TASTE,
      mentionedReviewCount: 15,
      sentiments: { positive: 12, negative: 2, neutral: 1, mixed: 0 },
    },
    {
      aspect: ReviewAspect.FRESHNESS,
      mentionedReviewCount: 9,
      sentiments: { positive: 7, negative: 1, neutral: 0, mixed: 1 },
    },
    {
      aspect: ReviewAspect.CONDITION,
      mentionedReviewCount: 4,
      sentiments: { positive: 2, negative: 2, neutral: 0, mixed: 0 },
    },
    {
      aspect: ReviewAspect.PACKAGING,
      mentionedReviewCount: 3,
      sentiments: { positive: 1, negative: 1, neutral: 1, mixed: 0 },
    },
    {
      aspect: ReviewAspect.DELIVERY,
      mentionedReviewCount: 6,
      sentiments: { positive: 4, negative: 2, neutral: 0, mixed: 0 },
    },
    {
      aspect: ReviewAspect.PRICE,
      mentionedReviewCount: 0,
      sentiments: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
    },
  ],
}

/** 분석을 마친 리뷰가 아직 없는 상품. 항목 6개는 모두 0으로 온다 */
export const noReviewSentiments: ReviewSentimentSummary = {
  analyzedReviewCount: 0,
  overall: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
  aspects: reviewSentiments101.aspects.map(({ aspect }) => ({
    aspect,
    mentionedReviewCount: 0,
    sentiments: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
  })),
}

/** [긍정, 부정, 중립, 혼합] → 감성 집계. 항목은 넘긴 것만 채우고 나머지는 언급 0 */
function sentimentSummary(
  overall: [number, number, number, number],
  aspects: Partial<Record<ReviewAspect, [number, number, number, number]>> = {},
): ReviewSentimentSummary {
  const counts = ([positive, negative, neutral, mixed]: number[]): SentimentCounts => ({
    positive: positive ?? 0,
    negative: negative ?? 0,
    neutral: neutral ?? 0,
    mixed: mixed ?? 0,
  })
  const total = (values: number[]) => values.reduce((sum, n) => sum + n, 0)
  return {
    analyzedReviewCount: total(overall),
    overall: counts(overall),
    aspects: Object.values(ReviewAspect).map((aspect) => {
      const values = aspects[aspect] ?? [0, 0, 0, 0]
      return { aspect, mentionedReviewCount: total(values), sentiments: counts(values) }
    }),
  }
}

/**
 * 내 상품(mySellerProducts)별 감성 집계. 판매자 전체로 합치면 포장이 먼저 볼 항목(언급 15개 중 부정 6개)이다.
 * 109는 분석 리뷰 3개라 ‘리뷰가 더 모이면 보여요’ 묶음에 들어간다.
 */
export const reviewSentimentsByProduct: Record<number, ReviewSentimentSummary> = {
  101: reviewSentiments101,
  106: sentimentSummary([20, 6, 2, 2], {
    [ReviewAspect.TASTE]: [17, 2, 1, 0],
    [ReviewAspect.CONDITION]: [2, 0, 0, 0],
    [ReviewAspect.PACKAGING]: [5, 5, 1, 1],
    [ReviewAspect.DELIVERY]: [6, 1, 1, 0],
    [ReviewAspect.PRICE]: [4, 1, 1, 0],
  }),
  109: sentimentSummary([2, 1, 0, 0], { [ReviewAspect.TASTE]: [2, 1, 0, 0] }),
  110: sentimentSummary([5, 2, 1, 0], {
    [ReviewAspect.TASTE]: [5, 1, 0, 0],
    [ReviewAspect.FRESHNESS]: [3, 2, 0, 0],
    [ReviewAspect.CONDITION]: [1, 0, 0, 0],
    [ReviewAspect.DELIVERY]: [2, 2, 0, 0],
  }),
}

/** S-10 미리보기용 합산 결과. failedIds의 상품은 반응을 못 불러온 것으로 본다 */
export const reviewOverviewOf = (failedIds: number[] = []): ReviewOverview =>
  summarizeSellerSentiments(
    mySellerProducts,
    new Map(
      mySellerProducts.map((p) => [
        p.productId,
        failedIds.includes(p.productId)
          ? 'error'
          : (reviewSentimentsByProduct[p.productId] ?? 'error'),
      ]),
    ),
  )

// ─── 출고 (✅ GET /seller/shipments · /seller/shipments/{id}) — 테스트(MSW)·/__design 전용 ───

const sellerShipment = (
  row: Pick<SellerShipmentSummary, 'shipmentId' | 'orderId'> & Partial<SellerShipmentSummary>,
): SellerShipmentSummary => ({
  status: ShipmentStatus.PREPARING,
  recipientName: '이서연',
  regionGroup: 'GENERAL',
  estimatedShipDate: '2026-10-19',
  carrier: null,
  trackingNumber: null,
  delayed: false,
  createdAt: '2026-10-18T14:30:00',
  representativeProductName: '청송 꿀사과 부사',
  otherItemCount: 0,
  addressChangePending: false,
  ...row,
})

export const sellerShipments: SellerShipmentSummary[] = [
  sellerShipment({ shipmentId: 1, orderId: 184 }),
  sellerShipment({
    shipmentId: 2,
    orderId: 178,
    recipientName: '박민수',
    otherItemCount: 2,
    createdAt: '2026-10-18T11:02:00',
    addressChangePending: true,
  }),
  sellerShipment({
    shipmentId: 3,
    orderId: 170,
    recipientName: '정하늘',
    regionGroup: 'JEJU_MAIN',
    estimatedShipDate: '2026-10-17',
    delayed: true,
    createdAt: '2026-10-16T09:15:00',
  }),
  sellerShipment({
    shipmentId: 4,
    orderId: 131,
    status: ShipmentStatus.SHIPPING,
    carrier: ShipmentCarrier.CJ_LOGISTICS,
    trackingNumber: '684219371180',
    createdAt: '2026-10-16T08:20:00',
  }),
  sellerShipment({
    shipmentId: 5,
    orderId: 93,
    status: ShipmentStatus.DELIVERED,
    carrier: ShipmentCarrier.HANJIN,
    trackingNumber: '4012345678901',
    createdAt: '2026-10-12T11:40:00',
  }),
  sellerShipment({
    shipmentId: 6,
    orderId: 140,
    status: ShipmentStatus.CANCELLED,
    createdAt: '2026-10-14T20:05:00',
  }),
]

/** 대기 중인 배송지 변경 요청이 있는 출고 상세 (shipmentId 2) */
export const sellerShipmentDetail2: ShipmentDetail = {
  shipmentId: 2,
  orderId: 178,
  status: ShipmentStatus.PREPARING,
  carrier: null,
  trackingNumber: null,
  address: {
    recipientName: '박민수',
    recipientPhone: '01011112222',
    postalCode: '04524',
    address: '서울 중구 세종대로 110',
    addressDetail: '3층 301호',
    deliveryNote: null,
  },
  regionGroup: 'GENERAL',
  chargedShippingFee: 3000,
  additionalShippingFee: 0,
  estimatedShipDate: '2026-10-19',
  estimatedDeliveryStart: '2026-10-21',
  estimatedDeliveryEnd: '2026-10-22',
  delayed: false,
  createdAt: '2026-10-18T11:02:00',
  shippedAt: null,
  deliveredAt: null,
  completedAt: null,
  cancelledAt: null,
  items: [
    {
      orderItemId: 1781,
      productName: '청송 꿀사과 부사',
      optionName: '3kg (16~18과)',
      quantity: 1,
      unitPrice: 33900,
      canceledQuantity: 0,
      confirmed: false,
    },
  ],
  latestAddressChange: {
    requestId: 9,
    status: 'PENDING',
    requestedAddress: {
      recipientName: '박민수',
      recipientPhone: '01011112222',
      postalCode: '63000',
      address: '제주특별자치도 제주시 첨단로 242',
      addressDetail: '1층',
      deliveryNote: null,
    },
    additionalFeeNotice: 3000,
    rejectReason: null,
    requestedAt: '2026-10-18T12:10:00',
    processedAt: null,
  },
}

export const sellerShipmentDetails: ShipmentDetail[] = [sellerShipmentDetail2]

// ─── 취소 요청 ───────────────────────────────────────────

const refund = (patch: Partial<Refund> & Pick<Refund, 'refundId' | 'status'>): Refund => ({
  orderId: 178,
  orderItemId: 1781,
  productName: '청송 꿀사과 부사',
  optionName: '3kg (16~18과)',
  quantity: 1,
  unitPrice: 33900,
  itemAmount: 33900,
  shippingFeeAmount: 0,
  remoteAreaFeeAmount: 0,
  deductedShippingFeeAmount: 0,
  refundAmount: 33900,
  cancelReason: '옵션을 잘못 골랐어요',
  rejectReason: null,
  requestedAt: '2026-10-18T11:40:00',
  decidedAt: null,
  completedAt: null,
  ...patch,
})

/** 승인 대기 2 · 처리 중(배송비 환불) · 완료(배송비 차감) · 거절 · 철회 · 취소 실패 */
export const sellerRefunds: Refund[] = [
  refund({ refundId: 31, status: RefundStatus.REQUESTED }),
  refund({
    refundId: 30,
    status: RefundStatus.REQUESTED,
    orderId: 149,
    orderItemId: 1491,
    quantity: 2,
    itemAmount: 67800,
    refundAmount: 67800,
    cancelReason: null,
    requestedAt: '2026-10-17T20:10:00',
  }),
  refund({
    refundId: 24,
    status: RefundStatus.PROCESSING,
    orderId: 120,
    orderItemId: 1201,
    optionName: '1kg (5~6과)',
    unitPrice: 12900,
    itemAmount: 12900,
    shippingFeeAmount: 3000,
    refundAmount: 15900,
    cancelReason: '배송지를 잘못 적었어요',
    requestedAt: '2026-10-13T09:00:00',
    decidedAt: '2026-10-13T10:00:00',
  }),
  refund({
    refundId: 22,
    status: RefundStatus.COMPLETED,
    orderId: 88,
    orderItemId: 881,
    deductedShippingFeeAmount: 3000,
    refundAmount: 30900,
    requestedAt: '2026-10-12T09:00:00',
    decidedAt: '2026-10-12T09:30:00',
    completedAt: '2026-10-12T09:31:00',
  }),
  refund({
    refundId: 21,
    status: RefundStatus.REJECTED,
    orderId: 71,
    orderItemId: 711,
    productName: '청송 사과즙 100%',
    optionName: '30포',
    unitPrice: 29900,
    itemAmount: 29900,
    refundAmount: 29900,
    rejectReason: '이미 포장을 마쳐 오늘 출고했어요',
    requestedAt: '2026-10-10T16:30:00',
    decidedAt: '2026-10-10T17:00:00',
  }),
  refund({
    refundId: 20,
    status: RefundStatus.WITHDRAWN,
    orderId: 70,
    orderItemId: 701,
    requestedAt: '2026-10-09T08:00:00',
    decidedAt: '2026-10-09T08:20:00',
  }),
  refund({
    refundId: 19,
    status: RefundStatus.FAILED,
    orderId: 66,
    orderItemId: 661,
    // 서버가 FAILED에 적는 이유(Refund.FAILED_REASON)
    rejectReason: '환불 처리에 실패해 취소를 되돌렸습니다. 상품은 원래대로 배송됩니다.',
    requestedAt: '2026-10-08T10:00:00',
    decidedAt: '2026-10-08T10:10:00',
  }),
]

// ─── 정산 ────────────────────────────────────────────────
// 매일 02:00 정산. 정산 금액 = 판매 대금 − 수수료 3% + 배송비. 아래 4건의 합이 지갑 입금 내역과 같다.
// ✅ GET /payouts/me, /payouts/me/{id}, /payouts/me/{id}/items, /payouts/me/candidates 응답 모양.
// TODO(api): SALE_FEE 금액의 부호(양수로 내려오는지)는 서버 응답으로 확인. 화면은 부호와 상관없이 차감으로 보여 준다.

type SaleLine = { orderId: number; orderItemId: number; price: number; shipping: number }

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
      { orderId: 121, orderItemId: 1210, price: 23900, shipping: 3000 },
      { orderId: 122, orderItemId: 1227, price: 23900, shipping: 3000 },
      { orderId: 114, orderItemId: 1140, price: 33900, shipping: 3000 },
      { orderId: 111, orderItemId: 1118, price: 12900, shipping: 3000 },
    ],
  },
  {
    payoutId: 1019,
    createdAt: '2026-10-17T02:00:00',
    periodFrom: '2026-10-16T02:00:00',
    lines: [
      { orderId: 109, orderItemId: 1093, price: 23900, shipping: 3000 },
      { orderId: 105, orderItemId: 1051, price: 67800, shipping: 0 },
      { orderId: 100, orderItemId: 1002, price: 12900, shipping: 3000 },
    ],
  },
  {
    payoutId: 1016,
    createdAt: '2026-10-16T02:00:00',
    periodFrom: '2026-10-15T02:00:00',
    lines: [
      { orderId: 94, orderItemId: 944, price: 25800, shipping: 3000 },
      { orderId: 93, orderItemId: 937, price: 23900, shipping: 3000 },
    ],
  },
  {
    payoutId: 1011,
    createdAt: '2026-10-15T02:00:00',
    periodFrom: null,
    lines: [
      { orderId: 88, orderItemId: 888, price: 33900, shipping: 3000 },
      { orderId: 83, orderItemId: 831, price: 23900, shipping: 3000 },
      { orderId: 82, orderItemId: 829, price: 23900, shipping: 3000 },
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

export const payoutDetails: PayoutSellerDetail[] = payoutSets.map((set, index) => ({
  ...(payouts[index] as PayoutSummary),
  periodFrom: set.periodFrom,
  periodTo: set.createdAt,
  itemCount: set.lines.filter((l) => l.shipping > 0).length + set.lines.length * 2,
  sellerFeeAmount: set.lines.reduce((sum, l) => sum + feeOf(l.price), 0),
  sellerFeeItemCount: set.lines.length,
}))

/** payoutId → 정산 항목. 배송비 0원은 항목이 없다. 배송비 항목은 orderItemId가 null(주문 단위) */
export const payoutItems: Record<number, PayoutSellerItem[]> = Object.fromEntries(
  payoutSets.map((set) => {
    let id = set.payoutId * 100
    const item = (
      line: SaleLine,
      eventType: PayoutEventType,
      amount: number,
    ): PayoutSellerItem => ({
      payoutItemId: ++id,
      candidateId: id + 30000,
      eventType,
      orderId: line.orderId,
      orderItemId: eventType === PayoutEventType.SALE_SHIPPING_FEE ? null : line.orderItemId,
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
export const adjustedPayoutDetail: PayoutSellerDetail = {
  ...(payoutDetails[2] as PayoutSellerDetail),
  amount: (payoutDetails[2] as PayoutSellerDetail).amount - 3000,
  itemCount: (payoutDetails[2] as PayoutSellerDetail).itemCount + 1,
}

export const adjustedPayoutItems: PayoutSellerItem[] = [
  ...(payoutItems[1016] ?? []),
  {
    payoutItemId: 101699,
    candidateId: 39999,
    eventType: PayoutEventType.SALE_AMOUNT,
    orderId: 93,
    orderItemId: 937,
    sellerId: myStore.sellerId,
    amount: -3000,
    candidateCreatedAt: '2026-10-15T10:20:00',
    adjustment: { reason: '배송 중 파손으로 구매자에게 일부 환불한 금액이에요' },
  },
]

/** 아직 정산 전인 후보 3건(GET /payouts/me/candidates?unsettledOnly=true). 합계 = 센터 홈 정산 예정 금액 */
export const payoutCandidates: PayoutSellerCandidate[] = [
  {
    candidateId: 40012,
    eventType: PayoutEventType.SALE_AMOUNT,
    orderId: 184,
    orderItemId: 1841,
    sellerId: myStore.sellerId,
    amount: 23900,
    candidateCreatedAt: '2026-10-18T14:30:00',
    settled: false,
    payoutId: null,
    adjustment: null,
  },
  {
    candidateId: 40011,
    eventType: PayoutEventType.SALE_SHIPPING_FEE,
    orderId: 184,
    orderItemId: null,
    sellerId: myStore.sellerId,
    amount: 3000,
    candidateCreatedAt: '2026-10-18T14:30:00',
    settled: false,
    payoutId: null,
    adjustment: null,
  },
  {
    candidateId: 40008,
    eventType: PayoutEventType.SALE_AMOUNT,
    orderId: 170,
    orderItemId: 1701,
    sellerId: myStore.sellerId,
    amount: expectedPayout - 23900 - 3000,
    candidateCreatedAt: '2026-10-18T09:15:00',
    settled: false,
    payoutId: null,
    adjustment: null,
  },
]

/** ✅ 후보 합계 + 다음 정산일(정책 상수). 센터 홈과 같은 값 */
export const payoutOutlook: PayoutOutlook = {
  expectedAmount: payoutCandidates.reduce((sum, c) => sum + c.amount, 0),
  pendingCount: payoutCandidates.length,
  truncated: false,
  nextPayoutDate: '2026-10-19T02:00:00',
}

// ─── 지갑·출금 ───────────────────────────────────────────
// 잔액 = 센터 홈의 sellerWalletBalance(✅ GET /wallets/sellers/me/balance). 처리 중 출금 200,000원은 출금 가능 금액에서 뺀다.
// TODO(api): ❌ 출금·입출금 내역·계좌 API 없음 → 아래는 미리보기 전용

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
  const detail = payoutDetails[index] as PayoutSellerDetail
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
