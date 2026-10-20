import {
  type PayoutCandidate,
  type PayoutDetail,
  PayoutEventType,
  type PayoutItem,
  type PayoutSummary,
  type SellerApplicationAdminDetail,
  type SellerApplicationAdminSummary,
} from '@/shared/api/types'
import { PAYOUT_FEE_RATE } from '@/shared/lib/constants'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import type { AdjustTarget, PayoutFilter, PayoutRunResult } from './types'

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
      'reviewStartedAt' | 'approvedAt' | 'rejectedAt' | 'rejectReason'
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
