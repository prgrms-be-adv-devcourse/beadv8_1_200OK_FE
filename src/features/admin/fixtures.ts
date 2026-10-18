import {
  type PayoutDetail,
  PayoutEventType,
  type PayoutItem,
  type PayoutSummary,
} from '@/shared/api/types'
import { PAYOUT_FEE_RATE } from '@/shared/lib/constants'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import {
  type AdjustmentLog,
  type AdjustTarget,
  type AdminSellerApplication,
  type Payee,
  type PayoutFilter,
  type PayoutLastRun,
  type PayoutRunResult,
  SellerReviewAction,
  type SellerReviewHistory,
} from './types'

// 1단계 샘플 데이터. 판매자 7~11은 products·farms fixtures와 같은 농가, 청송 햇살농원(7)의 정산은 seller fixtures와 같다.

export const adminName = '운영팀 정민호'
const reviewer = '정민호'

// ─── 판매자 심사 ─────────────────────────────────────────

type Seed = Omit<
  AdminSellerApplication,
  'history' | 'reviewerName' | 'reason' | 'activeOrderCount'
> & {
  reviewStartedAt?: string
  decidedAt?: string
  suspendedAt?: string
  reason?: string
  activeOrderCount?: number
}

function historyOf(seed: Seed): SellerReviewHistory[] {
  const line = (action: SellerReviewAction, at: string, reason: string | null = null) => ({
    action,
    at,
    adminName: action === SellerReviewAction.APPLY ? null : reviewer,
    reason,
  })
  const history = [line(SellerReviewAction.APPLY, seed.appliedAt)]
  if (seed.reviewStartedAt)
    history.push(line(SellerReviewAction.START_REVIEW, seed.reviewStartedAt))
  if (seed.status === SellerApplicationStatus.REJECTED && seed.decidedAt) {
    history.push(line(SellerReviewAction.REJECT, seed.decidedAt, seed.reason ?? null))
  }
  if (seed.decidedAt && seed.status !== SellerApplicationStatus.REJECTED) {
    history.push(line(SellerReviewAction.APPROVE, seed.decidedAt))
  }
  if (seed.suspendedAt) {
    history.push(line(SellerReviewAction.SUSPEND, seed.suspendedAt, seed.reason ?? null))
  }
  return history
}

const S = SellerApplicationStatus

const seeds: Seed[] = [
  {
    sellerId: 13,
    storeName: '영암 무화과정원',
    representativeName: '최다은',
    businessNumber: '415-12-08831',
    mailOrderNumber: '제2026-전남영암-0042호',
    bankName: '농협은행',
    accountNumberMasked: '302-••••-1187',
    accountHolder: '최다은',
    status: S.APPLIED,
    appliedAt: '2026-10-17T15:20:00',
  },
  {
    sellerId: 14,
    storeName: '괴산 유기농콩밭',
    representativeName: '한상욱',
    businessNumber: '301-25-77104',
    mailOrderNumber: '제2026-충북괴산-0018호',
    bankName: '국민은행',
    accountNumberMasked: '611-••••-5032',
    accountHolder: '한상욱',
    status: S.APPLIED,
    appliedAt: '2026-10-16T11:05:00',
  },
  {
    sellerId: 15,
    storeName: '담양 대숲딸기',
    representativeName: '오미래',
    businessNumber: '409-31-26650',
    mailOrderNumber: '제2026-전남담양-0027호',
    bankName: '농협은행',
    accountNumberMasked: '351-••••-8840',
    accountHolder: '오미래',
    status: S.APPLIED,
    appliedAt: '2026-10-16T09:40:00',
  },
  {
    sellerId: 16,
    storeName: '남해 시금치밭',
    representativeName: '박지훈',
    businessNumber: '613-08-45512',
    mailOrderNumber: '제2026-경남남해-0009호',
    bankName: '신한은행',
    accountNumberMasked: '110-••••-2209',
    accountHolder: '박지훈',
    status: S.UNDER_REVIEW,
    appliedAt: '2026-10-15T14:10:00',
    reviewStartedAt: '2026-10-16T10:00:00',
  },
  {
    sellerId: 17,
    storeName: '보성 녹차언덕',
    representativeName: '윤해솔',
    businessNumber: '415-90-11873',
    mailOrderNumber: '제2026-전남보성-0033호',
    bankName: '우리은행',
    accountNumberMasked: '1002-••••-0771',
    accountHolder: '윤해솔',
    status: S.REJECTED,
    appliedAt: '2026-10-13T16:30:00',
    reviewStartedAt: '2026-10-14T09:30:00',
    decidedAt: '2026-10-14T15:00:00',
    reason: '통신판매업 신고번호를 확인할 수 없어요',
  },
  {
    sellerId: 7,
    storeName: '청송 햇살농원',
    representativeName: '김영수',
    businessNumber: '512-81-04273',
    mailOrderNumber: '제2026-경북청송-0031호',
    bankName: '농협은행',
    accountNumberMasked: '301-••••-5521',
    accountHolder: '김영수',
    status: S.APPROVED,
    appliedAt: '2026-09-02T10:00:00',
    reviewStartedAt: '2026-09-02T14:00:00',
    decidedAt: '2026-09-03T11:00:00',
    activeOrderCount: 5,
  },
  {
    sellerId: 8,
    storeName: '땅끝고구마농장',
    representativeName: '박정희',
    businessNumber: '415-27-60318',
    mailOrderNumber: '제2026-전남해남-0015호',
    bankName: '농협은행',
    accountNumberMasked: '352-••••-4410',
    accountHolder: '박정희',
    status: S.APPROVED,
    appliedAt: '2026-09-05T13:00:00',
    reviewStartedAt: '2026-09-05T16:00:00',
    decidedAt: '2026-09-06T10:30:00',
    activeOrderCount: 4,
  },
  {
    sellerId: 9,
    storeName: '서귀포 귤빛농장',
    representativeName: '고은비',
    businessNumber: '616-14-90235',
    mailOrderNumber: '제2026-제주서귀포-0061호',
    bankName: '하나은행',
    accountNumberMasked: '620-••••-3318',
    accountHolder: '고은비',
    status: S.APPROVED,
    appliedAt: '2026-09-09T09:20:00',
    reviewStartedAt: '2026-09-09T13:00:00',
    decidedAt: '2026-09-10T09:00:00',
    activeOrderCount: 0,
  },
  {
    sellerId: 10,
    storeName: '대관령 고원농장',
    representativeName: '최태호',
    businessNumber: '226-50-18874',
    mailOrderNumber: '제2026-강원평창-0012호',
    bankName: '농협은행',
    accountNumberMasked: '317-••••-0926',
    accountHolder: '최태호',
    status: S.APPROVED,
    appliedAt: '2026-09-12T10:10:00',
    reviewStartedAt: '2026-09-12T15:00:00',
    decidedAt: '2026-09-13T10:00:00',
    activeOrderCount: 2,
  },
  {
    sellerId: 11,
    storeName: '진도 바닷바람농원',
    representativeName: '이순자',
    businessNumber: '415-61-33092',
    mailOrderNumber: '제2026-전남진도-0007호',
    bankName: '기업은행',
    accountNumberMasked: '010-••••-6627',
    accountHolder: '이순자',
    status: S.APPROVED,
    appliedAt: '2026-09-15T11:00:00',
    reviewStartedAt: '2026-09-15T14:30:00',
    decidedAt: '2026-09-16T09:30:00',
    activeOrderCount: 1,
  },
  {
    sellerId: 12,
    storeName: '고양 초록온실',
    representativeName: '정은수',
    businessNumber: '128-37-55120',
    mailOrderNumber: '제2026-경기고양-0044호',
    bankName: '국민은행',
    accountNumberMasked: '942-••••-1036',
    accountHolder: '정은수',
    status: S.SUSPENDED,
    appliedAt: '2026-09-18T10:00:00',
    reviewStartedAt: '2026-09-18T14:00:00',
    decidedAt: '2026-09-19T10:00:00',
    suspendedAt: '2026-10-17T18:00:00',
    reason: '출고 지연이 반복돼 판매 권한을 정지했어요',
    activeOrderCount: 0,
  },
]

export const sellerApplications: AdminSellerApplication[] = seeds.map((seed) => {
  const { reviewStartedAt, decidedAt, suspendedAt, reason, activeOrderCount, ...rest } = seed
  return {
    ...rest,
    reviewerName: reviewStartedAt ? reviewer : null,
    reason: reason ?? null,
    activeOrderCount: activeOrderCount ?? null,
    history: historyOf(seed),
  }
})

export const findApplication = (sellerId: number) =>
  sellerApplications.find((a) => a.sellerId === sellerId) ?? null

// ─── 정산 관리 ───────────────────────────────────────────
// 매일 02:00 정산. 판매자 정산 = 판매 대금 − 수수료 3% + 배송비, 그날 수수료 합은 플랫폼 몫(system) 한 건.

type SaleLine = { orderItemId: number; price: number; shipping: number }
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
          { orderItemId: 1210, price: 23900, shipping: 3000 },
          { orderItemId: 1227, price: 23900, shipping: 3000 },
          { orderItemId: 1140, price: 33900, shipping: 3000 },
          { orderItemId: 1118, price: 12900, shipping: 3000 },
        ],
      },
      {
        payoutId: 1022,
        payeeId: 8,
        lines: [
          { orderItemId: 1231, price: 15900, shipping: 3000 },
          { orderItemId: 1204, price: 24900, shipping: 3000 },
          { orderItemId: 1177, price: 15900, shipping: 3000 },
        ],
      },
      {
        payoutId: 1023,
        payeeId: 9,
        lines: [
          { orderItemId: 1251, price: 13900, shipping: 3000 },
          { orderItemId: 1212, price: 13900, shipping: 3000 },
          { orderItemId: 1144, price: 22900, shipping: 3000 },
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
          { orderItemId: 1093, price: 23900, shipping: 3000 },
          { orderItemId: 1051, price: 67800, shipping: 0 },
          { orderItemId: 1002, price: 12900, shipping: 3000 },
        ],
      },
      {
        payoutId: 1018,
        payeeId: 11,
        lines: [
          { orderItemId: 1062, price: 6900, shipping: 3000 },
          { orderItemId: 1039, price: 13800, shipping: 3000 },
        ],
      },
      {
        payoutId: 1017,
        payeeId: 12,
        lines: [
          { orderItemId: 1006, price: 18000, shipping: 3000 },
          { orderItemId: 1025, price: 34000, shipping: 3000 },
        ],
      },
    ],
  },
]

export const payees: Payee[] = sellerApplications
  .filter((a) => a.status === S.APPROVED || a.status === S.SUSPENDED)
  .map((a) => ({ payeeId: a.sellerId, name: a.storeName }))
  .sort((a, b) => a.payeeId - b.payeeId)

const payeeNameOf = (payeeId: number) =>
  payees.find((p) => p.payeeId === payeeId)?.name ?? `판매자 ${payeeId}`

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

export const adminPayoutDetails: PayoutDetail[] = batches.flatMap((batch) => [
  ...batch.sets.map((set) => ({
    ...summaryOf(set.payoutId),
    periodFrom: batch.periodFrom,
    periodTo: batch.createdAt,
    itemCount: set.lines.filter((l) => l.shipping > 0).length + set.lines.length * 2,
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
  batches.flatMap((batch) => {
    let id = batch.systemPayoutId * 100
    const item = (
      line: SaleLine,
      sellerId: number,
      eventType: PayoutEventType,
      amount: number,
    ): PayoutItem => ({
      payoutItemId: ++id,
      candidateId: id + 30000,
      eventType,
      orderItemId: line.orderItemId,
      sellerId,
      amount,
      candidateCreatedAt: '2026-10-12T02:00:00',
      adjustment: null,
    })
    return [
      ...batch.sets.map((set) => {
        id = set.payoutId * 100
        return [
          set.payoutId,
          set.lines.flatMap((line) => [
            item(line, set.payeeId, PayoutEventType.SALE_AMOUNT, line.price),
            item(line, set.payeeId, PayoutEventType.SALE_FEE, feeOf(line.price)),
            ...(line.shipping > 0
              ? [item(line, set.payeeId, PayoutEventType.SALE_SHIPPING_FEE, line.shipping)]
              : []),
          ]),
        ] as const
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
        ] as const
      })(),
    ]
  }),
)

export const findPayoutDetail = (payoutId: number) =>
  adminPayoutDetails.find((d) => d.payoutId === payoutId) ?? null

export const payeeNameOfPayout = (payout: Pick<PayoutSummary, 'payeeId' | 'system'>) =>
  payout.system || payout.payeeId === null ? '플랫폼 수수료' : payeeNameOf(payout.payeeId)

export const defaultPayoutFilter: PayoutFilter = {
  payee: 'all',
  from: '2026-10-17',
  to: '2026-10-18',
}

/** 화면 안에서만 거른다 (2단계: GET /payouts?payeeId&system&from&to) */
export function filterPayouts(list: PayoutSummary[], filter: PayoutFilter) {
  return list.filter((p) => {
    const day = p.createdAt.slice(0, 10)
    if (day < filter.from || day > filter.to) return false
    if (filter.payee === 'system') return p.system
    if (filter.payee === 'all') return true
    return p.payeeId === filter.payee
  })
}

export const lastRun: PayoutLastRun = { at: '2026-10-18T02:00:00', auto: true, payoutCount: 4 }

export const runResults: Record<PayoutRunResult['kind'], PayoutRunResult> = {
  ok: { kind: 'ok', candidateCount: 38, payoutCount: 6, totalAmount: 1284300 },
  none: { kind: 'none' },
  busy: { kind: 'busy' },
  error: { kind: 'error', message: '정산을 실행하지 못했어요. 잠시 뒤 다시 시도해 주세요.' },
}

// 1건 정산 오류 2종 (서버 detail 예상 문구)
export const singlePayoutErrors = {
  unconfirmed: '아직 구매확정되지 않은 주문 상품이에요',
  alreadyPaid: '이미 정산된 주문 상품이에요',
}

/** 구매확정됐지만 자동 정산에서 빠진 주문 상품 (1건 정산 성공용) */
export const pendingCandidateIds = [1301, 1302, 1305]

// ─── 정산 조정 ───────────────────────────────────────────

const lineIndex = new Map(
  batches.flatMap((batch) =>
    batch.sets.flatMap((set) =>
      set.lines.map((line) => [line.orderItemId, { line, set, batch }] as const),
    ),
  ),
)

export const isPaidOrderItem = (orderItemId: number) => lineIndex.has(orderItemId)

const baseLogs: Omit<AdjustmentLog, 'before' | 'after' | 'payeeName'>[] = [
  {
    adjustmentId: 3,
    orderItemId: 1204,
    amount: -10000,
    reason: '구매확정 후 환불 회수(신선도 문제, 판매자와 협의)',
    adminName: reviewer,
    createdAt: '2026-10-18T11:20:00',
  },
  {
    adjustmentId: 2,
    orderItemId: 1006,
    amount: -3000,
    reason: '배송비 중복 정산 정정',
    adminName: reviewer,
    createdAt: '2026-10-17T16:05:00',
  },
  {
    adjustmentId: 1,
    orderItemId: 1062,
    amount: 3000,
    reason: '배송비 누락 보정',
    adminName: reviewer,
    createdAt: '2026-10-17T10:40:00',
  },
]

/** 오래된 조정부터 금액 전후를 쌓아 계산한다. 결과는 최신순 */
export function withBalances(logs: Omit<AdjustmentLog, 'before' | 'after' | 'payeeName'>[]) {
  const running = new Map<number, number>()
  return [...logs]
    .reverse()
    .map((log) => {
      const found = lineIndex.get(log.orderItemId)
      const before = running.get(log.orderItemId) ?? (found ? netOf(found.line) : 0)
      running.set(log.orderItemId, before + log.amount)
      return {
        ...log,
        payeeName: found ? payeeNameOf(found.set.payeeId) : `주문 상품 ${log.orderItemId}`,
        before,
        after: before + log.amount,
      }
    })
    .reverse()
}

export const adjustmentLogs: AdjustmentLog[] = withBalances(baseLogs)

export function adjustTargetOf(orderItemId: number, logs: AdjustmentLog[]): AdjustTarget | null {
  const found = lineIndex.get(orderItemId)
  if (!found) return null
  const prior = logs.filter((l) => l.orderItemId === orderItemId)
  const priorTotal = prior.reduce((sum, l) => sum + l.amount, 0)
  return {
    orderItemId,
    payeeName: payeeNameOf(found.set.payeeId),
    payoutId: found.set.payoutId,
    payoutCreatedAt: found.batch.createdAt,
    currentAmount: netOf(found.line) + priorTotal,
    priorAdjustmentCount: prior.length,
    priorAdjustmentTotal: priorTotal,
  }
}

/** 미리보기 샘플: 청송 햇살농원 1210 (26,183원) */
export const sampleAdjustment = {
  orderItemId: '1210',
  amount: '-10,000',
  reason: '구매확정 후 환불 회수',
}
