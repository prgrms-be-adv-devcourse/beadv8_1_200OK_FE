import {
  ChargeStatus,
  type PayoutCandidate,
  type PayoutDetail,
  PayoutEventType,
  type PayoutItem,
  type PayoutSummary,
  ProductCategory,
  ProductCategoryGroup,
  type ProductDetail,
  ProductRegion,
  ProductStatus,
  type ProductSummary,
  ReviewAspect,
  ReviewKeywordAspect,
  ReviewSentiment,
  type SellerApplicationAdminDetail,
  type SellerApplicationAdminSummary,
} from '@/shared/api/types'
import { PAYOUT_FEE_RATE } from '@/shared/lib/constants'
import { PayoutBlockStatus } from '@/shared/lib/payoutBlockState'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { type AdminCharge, type AdminChargeDetail, TossLookup, TossPaymentStatus } from './charges'
import {
  type AdjustTarget,
  type BlockedOrder,
  DepositCheckReason,
  type DepositCheckReview,
  type KeywordAnalysis,
  type PayoutFilter,
  type PayoutRunResult,
  type Resolution,
  type ResolutionRequest,
  type SentimentAnalysis,
  type UntaggedProduct,
  type ZeroResultKeyword,
} from './types'

// 서버 응답 모양 그대로 둔 샘플 데이터 (previews · 테스트 · MSW 기본 응답).
// 신청 번호·회원 번호 7~11은 products·farms fixtures와 같은 농가, 청송 햇살농원(7)의 정산은 seller fixtures와 같다.

const S = SellerApplicationStatus
/** 심사를 결정한 관리자 회원 번호 */
export const ADMIN_MEMBER_ID = 1

// ─── 판매자 심사 ─────────────────────────────────────────

type Seed = Pick<
  SellerApplicationAdminDetail,
  | 'applicationId'
  | 'memberId'
  | 'storeName'
  | 'representativeName'
  | 'businessNumber'
  | 'mailOrderNumber'
  | 'status'
  | 'appliedAt'
> &
  Partial<
    Pick<
      SellerApplicationAdminDetail,
      'originPostalCode' | 'reviewStartedAt' | 'approvedAt' | 'rejectedAt' | 'rejectReason'
    >
  >

const seeds: Seed[] = [
  {
    applicationId: 13,
    memberId: 13,
    storeName: '영암 무화과정원',
    representativeName: '최다은',
    businessNumber: '415-12-08831',
    mailOrderNumber: '제2026-전남영암-0042호',
    originPostalCode: '58431',
    status: S.PENDING,
    appliedAt: '2026-10-16T09:40:00',
  },
  {
    applicationId: 14,
    memberId: 14,
    storeName: '괴산 유기농콩밭',
    representativeName: '한상욱',
    businessNumber: '301-25-77104',
    mailOrderNumber: '제2026-충북괴산-0018호',
    originPostalCode: '28044',
    status: S.PENDING,
    appliedAt: '2026-10-16T11:05:00',
  },
  {
    applicationId: 15,
    memberId: 15,
    storeName: '담양 대숲딸기',
    representativeName: '오미래',
    businessNumber: '409-31-26650',
    mailOrderNumber: '제2026-전남담양-0027호',
    originPostalCode: '57339',
    status: S.PENDING,
    appliedAt: '2026-10-17T15:20:00',
  },
  {
    applicationId: 16,
    memberId: 16,
    storeName: '남해 시금치밭',
    representativeName: '박지훈',
    businessNumber: '613-08-45512',
    mailOrderNumber: '제2026-경남남해-0009호',
    originPostalCode: '52430',
    status: S.IN_REVIEW,
    appliedAt: '2026-10-15T14:10:00',
    reviewStartedAt: '2026-10-16T10:00:00',
  },
  {
    applicationId: 17,
    memberId: 17,
    storeName: '보성 녹차언덕',
    representativeName: '윤해솔',
    businessNumber: '415-90-11873',
    mailOrderNumber: '제2026-전남보성-0033호',
    originPostalCode: '59435',
    status: S.REJECTED,
    appliedAt: '2026-10-13T16:30:00',
    reviewStartedAt: '2026-10-14T09:30:00',
    rejectedAt: '2026-10-14T15:00:00',
    rejectReason: '통신판매업 신고번호를 확인할 수 없어요',
  },
  {
    applicationId: 7,
    memberId: 7,
    storeName: '청송 햇살농원',
    representativeName: '김영수',
    businessNumber: '512-81-04273',
    mailOrderNumber: '제2026-경북청송-0031호',
    originPostalCode: '37421',
    status: S.APPROVED,
    appliedAt: '2026-09-02T10:00:00',
    reviewStartedAt: '2026-09-02T14:00:00',
    approvedAt: '2026-09-03T11:00:00',
  },
  {
    applicationId: 8,
    memberId: 8,
    storeName: '땅끝고구마농장',
    representativeName: '박정희',
    businessNumber: '415-27-60318',
    mailOrderNumber: '제2026-전남해남-0015호',
    originPostalCode: '52430',
    status: S.APPROVED,
    appliedAt: '2026-09-05T13:00:00',
    reviewStartedAt: '2026-09-05T16:00:00',
    approvedAt: '2026-09-06T10:30:00',
  },
  {
    applicationId: 9,
    memberId: 9,
    storeName: '서귀포 귤빛농장',
    representativeName: '고은비',
    businessNumber: '616-14-90235',
    mailOrderNumber: '제2026-제주서귀포-0061호',
    originPostalCode: '63535',
    status: S.APPROVED,
    appliedAt: '2026-09-09T09:20:00',
    reviewStartedAt: '2026-09-09T13:00:00',
    approvedAt: '2026-09-10T09:00:00',
  },
  {
    applicationId: 10,
    memberId: 10,
    storeName: '대관령 고원농장',
    representativeName: '최태호',
    businessNumber: '226-50-18874',
    mailOrderNumber: '제2026-강원평창-0012호',
    originPostalCode: '25363',
    status: S.APPROVED,
    appliedAt: '2026-09-12T10:10:00',
    reviewStartedAt: '2026-09-12T15:00:00',
    approvedAt: '2026-09-13T10:00:00',
  },
  {
    applicationId: 11,
    memberId: 11,
    storeName: '진도 바닷바람농원',
    representativeName: '이순자',
    businessNumber: '415-61-33092',
    mailOrderNumber: '제2026-전남진도-0007호',
    status: S.APPROVED,
    appliedAt: '2026-09-15T11:00:00',
    reviewStartedAt: '2026-09-15T14:30:00',
    approvedAt: '2026-09-16T09:30:00',
  },
]

const decided = (seed: Seed) => seed.status === S.APPROVED || seed.status === S.REJECTED

/** 관리자 신청 상세 (오래된 신청부터 — 서버 정렬과 같다) */
export const sellerApplications: SellerApplicationAdminDetail[] = seeds
  .map((seed) => ({
    // 우편번호가 없는 신청은 이 칸이 생기기 전 신청(서버 null)
    originPostalCode: null,
    reviewStartedAt: null,
    approvedAt: null,
    rejectedAt: null,
    rejectReason: null,
    ...seed,
    reviewerId: decided(seed) ? ADMIN_MEMBER_ID : null,
  }))
  .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt))

/** 목록 한 건 (상세에서 목록 필드만) */
export const toApplicationSummary = ({
  applicationId,
  memberId,
  storeName,
  representativeName,
  businessNumber,
  status,
  appliedAt,
}: SellerApplicationAdminDetail): SellerApplicationAdminSummary => ({
  applicationId,
  memberId,
  storeName,
  representativeName,
  businessNumber,
  status,
  appliedAt,
})

export const sellerApplicationSummaries = sellerApplications.map(toApplicationSummary)

export const findApplication = (applicationId: number) =>
  sellerApplications.find((a) => a.applicationId === applicationId) ?? null

export const applicationCounts = Object.fromEntries(
  Object.values(S).map((s) => [s, sellerApplications.filter((a) => a.status === s).length]),
) as Record<SellerApplicationStatus, number>

// ─── 멈춘 충전 건 ────────────────────────────────────────
// GET /admin/wallets/charges 목록(요청 시각 순)과 상세의 토스 조회 결과. 충전 번호는 CHG_ + UUID.

const heldCharge = (
  chargeNo: string,
  memberId: number,
  amount: number,
  createdAt: string,
): AdminCharge => ({
  chargeNo,
  memberId,
  amount,
  status: ChargeStatus.IN_PROGRESS,
  failureCode: null,
  failureMessage: null,
  heldForReview: true,
  createdAt,
  approvedAfterFailureAt: null,
  paymentCancelRequestedAt: null,
  paymentCanceledAt: null,
})

/** 멈춘 처리 중 · 토스 DONE 같은 금액 → 잔액 반영 · 결제 취소 */
export const CHARGE_DONE = 'CHG_3f2b1c9e-8a4d-4e6f-9b1a-2c3d4e5f6a7b'
/** 멈춘 처리 중 · 토스에 결제 없음 → 실패 처리 */
export const CHARGE_NOT_FOUND = 'CHG_7a1d2e3f-4b5c-4d6e-8f9a-0b1c2d3e4f50'
/** 멈춘 처리 중 · 결제 취소 결과 모름 → 결제 취소만 */
export const CHARGE_CANCEL_REQUESTED = 'CHG_9c8b7a6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d'
/** 승인 뒤 실패 → 결제 취소 */
export const CHARGE_AFTER_FAILURE = 'CHG_1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e'
/** 멈춘 처리 중 · 토스 답 없음 → 다시 조회만 */
export const CHARGE_UNKNOWN = 'CHG_5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9'

export const adminCharges: AdminCharge[] = [
  heldCharge(CHARGE_DONE, 12, 10_000, '2026-11-18T10:00:00'),
  heldCharge(CHARGE_NOT_FOUND, 23, 30_000, '2026-11-18T11:42:00'),
  {
    ...heldCharge(CHARGE_CANCEL_REQUESTED, 31, 50_000, '2026-11-18T13:05:00'),
    paymentCancelRequestedAt: '2026-11-19T09:12:00',
  },
  {
    ...heldCharge(CHARGE_AFTER_FAILURE, 44, 20_000, '2026-11-18T15:30:00'),
    status: ChargeStatus.FAILED,
    heldForReview: false,
    failureCode: 'CONFIRM_TIMEOUT',
    failureMessage: '결제 승인 응답을 받지 못했습니다.',
    approvedAfterFailureAt: '2026-11-18T15:31:10',
  },
  heldCharge(CHARGE_UNKNOWN, 52, 100_000, '2026-11-19T08:20:00'),
]

type TossAnswer = Omit<AdminChargeDetail, 'charge'>

const tossDone = (amount: number): TossAnswer => ({
  tossLookup: TossLookup.FOUND,
  tossStatus: TossPaymentStatus.DONE,
  tossTotalAmount: amount,
})

export const tossAnswers: Record<string, TossAnswer> = {
  [CHARGE_DONE]: tossDone(10_000),
  [CHARGE_NOT_FOUND]: { tossLookup: TossLookup.NOT_FOUND, tossStatus: null, tossTotalAmount: null },
  [CHARGE_CANCEL_REQUESTED]: tossDone(50_000),
  [CHARGE_AFTER_FAILURE]: tossDone(20_000),
  [CHARGE_UNKNOWN]: { tossLookup: TossLookup.UNKNOWN, tossStatus: null, tossTotalAmount: null },
}

export const findChargeDetail = (chargeNo: string): AdminChargeDetail | null => {
  const charge = adminCharges.find((c) => c.chargeNo === chargeNo)
  const toss = tossAnswers[chargeNo]
  return charge && toss ? { charge, ...toss } : null
}

// ─── 정산 관리 ───────────────────────────────────────────
// 매일 02:00 정산. 판매자 정산 = 판매 대금 − 수수료 3% + 배송비(주문 단위), 그날 수수료 합은 플랫폼 몫(system) 한 건.

type SaleLine = { orderId: number; orderItemId: number; price: number; shipping: number }
type SellerSet = { payoutId: number; payeeId: number; lines: SaleLine[] }
type Batch = { createdAt: string; periodFrom: string; systemPayoutId: number; sets: SellerSet[] }

const feeOf = (price: number) => Math.round((price * PAYOUT_FEE_RATE) / 100)
const netOf = (line: SaleLine) => line.price - feeOf(line.price) + line.shipping

const batches: Batch[] = [
  {
    createdAt: '2026-10-18T02:00:00',
    periodFrom: '2026-10-17T02:00:00',
    systemPayoutId: 1024,
    sets: [
      {
        payoutId: 1021,
        payeeId: 7,
        lines: [
          { orderId: 184, orderItemId: 1210, price: 23900, shipping: 3000 },
          { orderId: 190, orderItemId: 1227, price: 23900, shipping: 3000 },
          { orderId: 171, orderItemId: 1140, price: 33900, shipping: 3000 },
          { orderId: 165, orderItemId: 1118, price: 12900, shipping: 3000 },
        ],
      },
      {
        payoutId: 1022,
        payeeId: 8,
        lines: [
          { orderId: 191, orderItemId: 1231, price: 15900, shipping: 3000 },
          { orderId: 183, orderItemId: 1204, price: 24900, shipping: 3000 },
          { orderId: 176, orderItemId: 1177, price: 15900, shipping: 3000 },
        ],
      },
      {
        payoutId: 1023,
        payeeId: 9,
        lines: [
          { orderId: 195, orderItemId: 1251, price: 13900, shipping: 3000 },
          { orderId: 184, orderItemId: 1212, price: 13900, shipping: 3000 },
          { orderId: 172, orderItemId: 1144, price: 22900, shipping: 3000 },
        ],
      },
    ],
  },
  {
    createdAt: '2026-10-17T02:00:00',
    periodFrom: '2026-10-16T02:00:00',
    systemPayoutId: 1020,
    sets: [
      {
        payoutId: 1019,
        payeeId: 7,
        lines: [
          { orderId: 160, orderItemId: 1093, price: 23900, shipping: 3000 },
          { orderId: 151, orderItemId: 1051, price: 67800, shipping: 0 },
          { orderId: 140, orderItemId: 1002, price: 12900, shipping: 3000 },
        ],
      },
      {
        payoutId: 1018,
        payeeId: 11,
        lines: [
          { orderId: 153, orderItemId: 1062, price: 6900, shipping: 3000 },
          { orderId: 148, orderItemId: 1039, price: 13800, shipping: 3000 },
        ],
      },
      {
        payoutId: 1017,
        payeeId: 12,
        lines: [
          { orderId: 141, orderItemId: 1006, price: 18000, shipping: 3000 },
          { orderId: 145, orderItemId: 1025, price: 34000, shipping: 3000 },
        ],
      },
    ],
  },
]

export const adminPayouts: PayoutSummary[] = batches.flatMap((batch) => {
  const allLines = batch.sets.flatMap((set) => set.lines)
  return [
    ...batch.sets.map((set) => ({
      payoutId: set.payoutId,
      snapshotId: set.payoutId + 5000,
      payeeId: set.payeeId,
      system: false,
      amount: set.lines.reduce((sum, line) => sum + netOf(line), 0),
      createdAt: batch.createdAt,
    })),
    {
      payoutId: batch.systemPayoutId,
      snapshotId: batch.systemPayoutId + 5000,
      payeeId: null,
      system: true,
      amount: allLines.reduce((sum, line) => sum + feeOf(line.price), 0),
      createdAt: batch.createdAt,
    },
  ]
})

const summaryOf = (payoutId: number) =>
  adminPayouts.find((p) => p.payoutId === payoutId) as PayoutSummary

/** 배송비 항목은 주문 단위 1건 (orderItemId null) */
const shippingOrders = (lines: SaleLine[]) =>
  [...new Set(lines.filter((l) => l.shipping > 0).map((l) => l.orderId))].map(
    (orderId) => lines.find((l) => l.orderId === orderId && l.shipping > 0) as SaleLine,
  )

export const adminPayoutDetails: PayoutDetail[] = batches.flatMap((batch) => [
  ...batch.sets.map((set) => ({
    ...summaryOf(set.payoutId),
    periodFrom: batch.periodFrom,
    periodTo: batch.createdAt,
    itemCount: set.lines.length * 2 + shippingOrders(set.lines).length,
    systemPayoutId: batch.systemPayoutId,
    sellerFeeAmount: set.lines.reduce((sum, l) => sum + feeOf(l.price), 0),
    sellerFeeItemCount: set.lines.length,
  })),
  {
    ...summaryOf(batch.systemPayoutId),
    periodFrom: batch.periodFrom,
    periodTo: batch.createdAt,
    itemCount: batch.sets.reduce((sum, set) => sum + set.lines.length, 0),
    systemPayoutId: null,
    sellerFeeAmount: null,
    sellerFeeItemCount: null,
  },
])

/** payoutId → 정산 항목. 플랫폼 몫은 수수료 항목만 */
export const adminPayoutItems: Record<number, PayoutItem[]> = Object.fromEntries(
  batches.flatMap((batch): [number, PayoutItem[]][] => {
    let id = 0
    const item = (
      line: SaleLine,
      sellerId: number,
      eventType: PayoutEventType,
      amount: number,
    ): PayoutItem => ({
      payoutItemId: ++id,
      candidateId: id + 30000,
      eventType,
      orderId: line.orderId,
      orderItemId: eventType === PayoutEventType.SALE_SHIPPING_FEE ? null : line.orderItemId,
      sellerId,
      amount,
      candidateCreatedAt: '2026-10-12T02:00:00',
      adjustment: null,
    })
    return [
      ...batch.sets.map((set): [number, PayoutItem[]] => {
        id = set.payoutId * 100
        return [
          set.payoutId,
          [
            ...set.lines.flatMap((line) => [
              item(line, set.payeeId, PayoutEventType.SALE_AMOUNT, line.price),
              item(line, set.payeeId, PayoutEventType.SALE_FEE, feeOf(line.price)),
            ]),
            ...shippingOrders(set.lines).map((line) =>
              item(line, set.payeeId, PayoutEventType.SALE_SHIPPING_FEE, line.shipping),
            ),
          ],
        ]
      }),
      (() => {
        id = batch.systemPayoutId * 100
        return [
          batch.systemPayoutId,
          batch.sets.flatMap((set) =>
            set.lines.map((line) =>
              item(line, set.payeeId, PayoutEventType.SALE_FEE, feeOf(line.price)),
            ),
          ),
        ] as [number, PayoutItem[]]
      })(),
    ]
  }),
)

export const findPayoutDetail = (payoutId: number) =>
  adminPayoutDetails.find((d) => d.payoutId === payoutId) ?? null

/** 아직 정산 전인 후보 (구매확정 뒤 대기 중) */
export const adminPayoutCandidates: PayoutCandidate[] = [
  {
    candidateId: 40011,
    eventType: PayoutEventType.SALE_AMOUNT,
    orderId: 201,
    orderItemId: 1301,
    sellerId: 7,
    amount: 23900,
    candidateCreatedAt: '2026-10-18T13:10:00',
    settled: false,
    payoutId: null,
    adjustment: null,
  },
  {
    candidateId: 40012,
    eventType: PayoutEventType.SALE_FEE,
    orderId: 201,
    orderItemId: 1301,
    sellerId: 7,
    amount: 717,
    candidateCreatedAt: '2026-10-18T13:10:00',
    settled: false,
    payoutId: null,
    adjustment: null,
  },
  {
    candidateId: 40013,
    eventType: PayoutEventType.SALE_SHIPPING_FEE,
    orderId: 201,
    orderItemId: null,
    sellerId: 7,
    amount: 3000,
    candidateCreatedAt: '2026-10-18T13:10:00',
    settled: false,
    payoutId: null,
    adjustment: null,
  },
]

export const defaultPayoutFilter: PayoutFilter = {
  payee: 'all',
  payeeId: '',
  from: '2026-10-17',
  to: '2026-10-18',
}

/** 미리보기용 화면 안 거르기 (서버 GET /admin/payouts?payeeId&system&from&to와 같은 조건) */
export function filterPayouts(list: PayoutSummary[], filter: PayoutFilter) {
  return list.filter((p) => {
    const day = p.createdAt.slice(0, 10)
    if (day < filter.from || day > filter.to) return false
    if (filter.payee === 'system') return p.system
    if (filter.payee === 'seller') return String(p.payeeId) === filter.payeeId.trim()
    return true
  })
}

export const runResults: Record<'ok' | 'skipWait' | 'error', PayoutRunResult> = {
  ok: { kind: 'ok', executionId: 101, status: 'COMPLETED', skipWait: false },
  skipWait: { kind: 'ok', executionId: 102, status: 'COMPLETED', skipWait: true },
  error: {
    kind: 'error',
    message: '정산 배치를 실행하지 못했어요. 실행 번호와 상태는 서버 로그에 남아요',
  },
}

// ─── 정산 조정 ───────────────────────────────────────────

/** 미리보기 샘플: 청송 햇살농원 1210 (23,900 − 717 + 3,000 = 26,183원) */
export const sampleAdjustment = {
  orderItemId: '1210',
  eventType: PayoutEventType.SALE_AMOUNT,
  amount: '-10,000',
  reason: '구매확정 후 환불 회수',
}

/** 금액 조회 API가 생겼을 때의 미리보기 모양 (지금 화면은 idle만 쓴다) */
export const sampleAdjustTarget: AdjustTarget = {
  orderItemId: 1210,
  payeeName: '판매자 7',
  payoutId: 1021,
  payoutCreatedAt: '2026-10-18T02:00:00',
  currentAmount: 26183,
  priorAdjustmentCount: 0,
  priorAdjustmentTotal: 0,
}

// ─── 리뷰 분석 테스트 ────────────────────────────────────

const analysisProduct = (
  productId: number,
  name: string,
  options: { optionId: number; name: string; salePrice: number }[],
): ProductDetail => ({
  productId,
  name,
  descriptionHtml: '<p>샘플 상품이에요.</p>',
  categoryGroup: ProductCategoryGroup.AGRICULTURE,
  category: ProductCategory.FRUIT,
  region: ProductRegion.GYEONGBUK,
  status: ProductStatus.ON_SALE,
  minSalePrice: Math.min(...options.map((o) => o.salePrice)),
  minPriceListPrice: Math.min(...options.map((o) => o.salePrice)),
  discountRate: 0,
  soldOut: false,
  reviewCount: 0,
  averageRating: 0,
  imageUrls: [],
  options: options.map((o) => ({
    ...o,
    listPrice: o.salePrice,
    discountRate: 0,
    soldOut: false,
    lowStock: false,
  })),
  createdAt: '2026-10-01T09:00:00',
  updatedAt: '2026-10-01T09:00:00',
})

/** 옵션이 둘인 상품. 고르면 첫 옵션(1011)이 기본이다 */
export const analysisApple = analysisProduct(101, '청송 꿀사과 부사', [
  { optionId: 1011, name: '가정용 3kg', salePrice: 23900 },
  { optionId: 1012, name: '선물용 5kg', salePrice: 39900 },
])

/** 상품 고르기 목록 · 상세 (상품 목록 API 응답 모양) */
export const analysisProductDetails: ProductDetail[] = [
  analysisApple,
  analysisProduct(102, '성주 참외', [{ optionId: 1021, name: '2kg', salePrice: 19900 }]),
]

export const analysisProductSummaries: ProductSummary[] = analysisProductDetails.map((d) => ({
  productId: d.productId,
  name: d.name,
  thumbnailUrl: '',
  minSalePrice: d.minSalePrice,
  minPriceListPrice: d.minPriceListPrice,
  discountRate: d.discountRate,
  category: d.category,
  region: d.region,
  status: d.status,
  soldOut: d.soldOut,
  reviewCount: d.reviewCount,
  averageRating: d.averageRating,
}))

/** 확률 순서가 아닌 채로 둔다 (화면이 다시 정렬하는지 본다) */
export const keywordAnalysis: KeywordAnalysis = {
  analyzed: true,
  keywordVersion: '0.3',
  model: 'jev-keyword-2026-10',
  keywords: [
    {
      keywordId: 'C05',
      phrase: '포장이 꼼꼼해요',
      aspect: ReviewKeywordAspect.PACKAGING,
      probability: 0.42,
      expressed: false,
      excludedByTextureRule: false,
    },
    {
      keywordId: 'C02',
      phrase: '달아요',
      aspect: ReviewKeywordAspect.TASTE,
      probability: 0.97,
      expressed: true,
      excludedByTextureRule: false,
    },
    {
      keywordId: 'C07',
      phrase: '아삭해요',
      aspect: ReviewKeywordAspect.TASTE,
      probability: 0.93,
      expressed: false,
      excludedByTextureRule: true,
    },
    {
      keywordId: 'C11',
      phrase: '배송이 빨라요',
      aspect: ReviewKeywordAspect.DELIVERY,
      probability: 0.08,
      expressed: false,
      excludedByTextureRule: false,
    },
  ],
}

export const sentimentAnalysis: SentimentAnalysis = {
  analyzed: true,
  criteriaVersion: '2026-10-a',
  model: 'jev-sentiment-2026-10',
  overall: ReviewSentiment.MIXED,
  aspects: {
    [ReviewAspect.TASTE]: ReviewSentiment.POSITIVE,
    [ReviewAspect.FRESHNESS]: ReviewSentiment.NOT_MENTIONED,
    [ReviewAspect.CONDITION]: ReviewSentiment.NOT_MENTIONED,
    [ReviewAspect.PACKAGING]: ReviewSentiment.NEUTRAL,
    [ReviewAspect.DELIVERY]: ReviewSentiment.NEGATIVE,
    [ReviewAspect.PRICE]: ReviewSentiment.NOT_MENTIONED,
  },
}

/** 글자 없는 본문(예: "!!!")을 보냈을 때 */
export const keywordNotAnalyzed: KeywordAnalysis = {
  analyzed: false,
  keywordVersion: null,
  model: null,
  keywords: [],
}

export const sentimentNotAnalyzed: SentimentAnalysis = {
  analyzed: false,
  criteriaVersion: null,
  model: null,
  overall: null,
  aspects: {},
}

// ─── 막힌 주문 · 대사 확인 ───────────────────────────────
// 2001: 초과 청구로 3번 실패해 멈춤(근거 있음, 지금은 결제 금액이 바로잡혀 풀림)
// 2002: 수수료 불일치로 잠김(초과 청구가 아니라 근거 없음) · 2003: 해결됨(다음 실행 대기)

export const blockedOrders: BlockedOrder[] = [
  {
    orderId: 2001,
    status: PayoutBlockStatus.STOPPED,
    failedRunCount: 3,
    lastFailedAt: '2026-11-15T02:00:00',
    sellerIds: [7],
    reasons: ['AMOUNT_MISMATCH'],
    categories: ['SOURCE_DATA'],
    causes: [
      {
        orderItemId: 1301,
        eventType: PayoutEventType.SALE_AMOUNT,
        reason: 'AMOUNT_MISMATCH',
        category: 'SOURCE_DATA',
        detail:
          '결제 금액 30,000원 / 정산 대상 35,000원 (넘친 금액 5,000원, 처음 넘긴 주문상품 1302)',
        sellerId: 7,
        failedAt: '2026-11-15T02:00:00',
      },
      {
        orderItemId: null,
        eventType: PayoutEventType.SALE_SHIPPING_FEE,
        reason: 'AMOUNT_MISMATCH',
        category: 'SOURCE_DATA',
        detail: '결제 금액 30,000원 / 정산 대상 35,000원',
        sellerId: 7,
        failedAt: '2026-11-15T02:00:00',
      },
    ],
    evidenceAtBlock: {
      deductedAmount: 30000,
      candidateTotal: 35000,
      overflowAmount: 5000,
      firstOverflowItem: '1302',
      settledAmount: 10000,
      settledItems: ['1300'],
      aloneOverItems: [],
      sellerCount: 1,
      conflictAmounts: [],
    },
    evidenceNow: {
      deductedAmount: 35000,
      candidateTotal: 35000,
      overflowAmount: 0,
      firstOverflowItem: '판별 불가',
      settledAmount: 10000,
      settledItems: ['1300'],
      aloneOverItems: [],
      sellerCount: 1,
      conflictAmounts: [35000],
    },
  },
  {
    orderId: 2002,
    status: PayoutBlockStatus.LOCKED,
    failedRunCount: 1,
    lastFailedAt: '2026-11-14T02:00:00',
    sellerIds: [8],
    reasons: ['FEE_MISMATCH'],
    categories: ['SYSTEM'],
    causes: [
      {
        orderItemId: 1401,
        eventType: PayoutEventType.SALE_FEE,
        reason: 'FEE_MISMATCH',
        category: 'SYSTEM',
        detail: '수수료 불일치: 기대 300, 실제 500 <b>원문</b>',
        sellerId: 8,
        failedAt: '2026-11-14T02:00:00',
      },
    ],
    evidenceAtBlock: null,
    evidenceNow: null,
  },
  {
    orderId: 2003,
    status: PayoutBlockStatus.RESOLVED,
    failedRunCount: 1,
    lastFailedAt: '2026-11-13T02:00:00',
    sellerIds: [9],
    reasons: ['VERIFY_MISMATCH'],
    categories: ['SYSTEM'],
    causes: [
      {
        orderItemId: 1501,
        eventType: PayoutEventType.SALE_AMOUNT,
        reason: 'VERIFY_MISMATCH',
        category: 'SYSTEM',
        detail: '결과 검증 불일치: 스냅샷에 없는 항목',
        sellerId: 9,
        failedAt: '2026-11-13T02:00:00',
      },
    ],
    evidenceAtBlock: null,
    evidenceNow: null,
  },
]

const REQUEST_ID = '3f2b8c1e-7d4a-4b9e-9c21-5a6d8e0f1b23'

export const resolutionRequests: ResolutionRequest[] = [
  {
    resolutionRequestId: REQUEST_ID,
    orderId: 2003,
    method: 'REPROCESS',
    adminId: ADMIN_MEMBER_ID,
    resolvedAt: '2026-11-14T10:00:00',
    memo: '검증 코드 수정 배포 후 다시 처리 <script>alert(1)</script>',
    resolvedFailureCount: 1,
  },
]

export const resolutions: Resolution[] = [
  {
    resolutionId: 31,
    resolutionRequestId: REQUEST_ID,
    failureId: 11,
    orderId: 2003,
    orderItemId: 1501,
    sellerId: 9,
    eventType: PayoutEventType.SALE_AMOUNT,
    amount: 10000,
    reason: 'VERIFY_MISMATCH',
    category: 'SYSTEM',
    detail: '결과 검증 불일치: 스냅샷에 없는 항목',
    failedAt: '2026-11-13T02:00:00',
    method: 'REPROCESS',
    adminId: ADMIN_MEMBER_ID,
    resolvedAt: '2026-11-14T10:00:00',
    memo: '검증 코드 수정 배포 후 다시 처리 <script>alert(1)</script>',
  },
]

export const depositChecks: DepositCheckReview[] = [
  {
    payoutId: 1031,
    payeeId: 7,
    amount: 9700,
    walletPayeeId: 8,
    walletAmount: 9700,
    reason: DepositCheckReason.PAYEE_MISMATCH,
    attemptCount: 1,
    notFoundCount: 0,
    lastAskedAt: '2026-11-15T02:00:00',
  },
  {
    payoutId: 1030,
    payeeId: 8,
    amount: 19400,
    walletPayeeId: 8,
    walletAmount: 18400,
    reason: DepositCheckReason.AMOUNT_MISMATCH,
    attemptCount: 1,
    notFoundCount: 0,
    lastAskedAt: '2026-11-15T02:00:00',
  },
  {
    payoutId: 1029,
    payeeId: 9,
    amount: 4850,
    walletPayeeId: null,
    walletAmount: null,
    reason: DepositCheckReason.NOT_FOUND,
    attemptCount: 3,
    notFoundCount: 2,
    lastAskedAt: '2026-11-14T02:00:00',
  },
  {
    payoutId: 1028,
    payeeId: 7,
    amount: 29100,
    walletPayeeId: null,
    walletAmount: null,
    reason: DepositCheckReason.NO_RESPONSE,
    attemptCount: 3,
    notFoundCount: 0,
    lastAskedAt: '2026-11-13T02:00:00',
  },
]

// ─── 검색 점검 ───────────────────────────────────────────

/** 0건 많은 순 (같으면 마지막 검색이 늦은 순) */
export const zeroResultKeywords: ZeroResultKeyword[] = [
  {
    normalizedKeyword: '샤인머스켓',
    zeroResultCount: 12,
    lastSearchedAt: '2026-11-18T14:05:31',
    sampleKeyword: '샤인 머스켓',
  },
  {
    normalizedKeyword: '김장배추20kg',
    zeroResultCount: 7,
    lastSearchedAt: '2026-11-17T09:41:02',
    sampleKeyword: '김장배추 20kg',
  },
  {
    normalizedKeyword: '무농약블루베리',
    zeroResultCount: 4,
    lastSearchedAt: '2026-11-16T21:13:45',
    sampleKeyword: '무농약블루베리',
  },
  {
    normalizedKeyword: '제주한라봉선물세트',
    zeroResultCount: 1,
    lastSearchedAt: '2026-11-14T08:02:10',
    sampleKeyword: '제주 한라봉 선물세트',
  },
]

/** 최근 판정 순. 가장 높았던 태그가 목록에서 빠진 경우 · 확률 기록이 없는 경우를 같이 둔다 */
export const untaggedProducts: UntaggedProduct[] = [
  {
    productId: 128,
    productName: '국산 생강 1kg',
    judgedAt: '2026-11-18T14:05:31',
    topTagLabel: '김장·김치용',
    topScore: 0.83,
  },
  {
    productId: 131,
    productName: '햇 들기름 350ml (저온 압착, 국산 들깨 100%)',
    judgedAt: '2026-11-17T11:20:00',
    topTagLabel: '선물용',
    topScore: 0.8999,
  },
  {
    productId: 117,
    productName: '말린 표고버섯 슬라이스 200g',
    judgedAt: '2026-11-15T16:48:12',
    topTagLabel: null,
    topScore: 0.42,
  },
  {
    productId: 109,
    productName: '수제 도토리묵 2모',
    judgedAt: '2026-11-13T10:00:00',
    topTagLabel: null,
    topScore: null,
  },
]
