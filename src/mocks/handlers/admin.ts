import { HttpResponse, http } from 'msw'
import {
  adminPayoutCandidates,
  adminPayoutItems,
  adminPayouts,
  blockedOrders,
  depositChecks,
  findApplication,
  findPayoutDetail,
  keywordAnalysis,
  orderCandidates,
  periodResolutionRequests,
  resolutionRequests,
  resolutions,
  sellerApplicationSummaries,
  sentimentAnalysis,
  untaggedProducts,
  zeroResultKeywords,
} from '@/features/admin/fixtures'
import { SellerApplicationStatus } from '@/shared/api/types'
import { PayoutBlockStatus } from '@/shared/lib/payoutBlockState'
import { pageOf, problem } from './_shared'

// 관리자 판매자 심사·정산·리뷰 분석 기본 응답 (admin fixtures). 실패 시나리오는 테스트에서 server.use(...)로 덮는다.
// 처리(review·approve·reject)는 상태를 저장하지 않고 ‘처리 뒤 상세’ 모양만 돌려준다.

const applications = '*/api/v1/admin/seller-applications'
const payouts = '*/api/v1/admin/payouts'

const now = () => '2026-10-18T14:20:00'
const notFoundApplication = problem(404, '판매자 신청을 찾을 수 없습니다.')
const unsupported = () => problem(501, '아직 지원하지 않는 기능입니다.')

const detailOf = (id: string) => findApplication(Number(id))
const limitOf = (request: Request) => Number(new URL(request.url).searchParams.get('limit') ?? 20)

export const adminHandlers = [
  // ─── 판매자 신청 심사 ──────────────────────────────────
  http.get(applications, ({ request }) => {
    const params = new URL(request.url).searchParams
    const status = params.get('status')
    const list = status
      ? sellerApplicationSummaries.filter((a) => a.status === status)
      : sellerApplicationSummaries
    return HttpResponse.json(pageOf(list, params))
  }),
  http.get(`${applications}/:applicationId`, ({ params }) => {
    const detail = detailOf(params.applicationId as string)
    return detail ? HttpResponse.json(detail) : notFoundApplication
  }),
  http.post(`${applications}/:applicationId/review`, ({ params }) => {
    const detail = detailOf(params.applicationId as string)
    if (!detail) return notFoundApplication
    return HttpResponse.json({
      ...detail,
      status: SellerApplicationStatus.IN_REVIEW,
      reviewStartedAt: now(),
    })
  }),
  http.post(`${applications}/:applicationId/approve`, ({ params }) => {
    const detail = detailOf(params.applicationId as string)
    if (!detail) return notFoundApplication
    return HttpResponse.json({
      ...detail,
      status: SellerApplicationStatus.APPROVED,
      reviewStartedAt: detail.reviewStartedAt ?? now(),
      approvedAt: now(),
      reviewerId: 1,
    })
  }),
  http.post(`${applications}/:applicationId/reject`, async ({ params, request }) => {
    const detail = detailOf(params.applicationId as string)
    if (!detail) return notFoundApplication
    const body = (await request.json()) as { reason?: string }
    if (!body.reason?.trim()) {
      return problem(422, '요청 값이 올바르지 않습니다.', {
        errors: [{ path: 'reason', pointer: '/reason', detail: '거절 사유를 입력해 주세요.' }],
      })
    }
    return HttpResponse.json({
      ...detail,
      status: SellerApplicationStatus.REJECTED,
      rejectedAt: now(),
      rejectReason: body.reason.trim(),
      reviewerId: 1,
    })
  }),

  // ─── 정산 ──────────────────────────────────────────────
  // candidates · run · adjustments · blocked-orders · deposit-checks는 /:payoutId보다 먼저 둔다
  // orderId · status(여러 개, status=LOCKED&status=STOPPED)로 거른다
  http.get(`${payouts}/blocked-orders`, ({ request }) => {
    const params = new URL(request.url).searchParams
    const orderId = params.get('orderId')
    const statuses = params.getAll('status')
    const list = blockedOrders.filter(
      (o) =>
        (!orderId || String(o.orderId) === orderId) &&
        (statuses.length === 0 || statuses.includes(o.status)),
    )
    return HttpResponse.json(pageOf(list, params))
  }),
  // 기간(해결 시각, from 포함·to 미포함) 필수, adminId로 거른다
  http.get(`${payouts}/resolution-requests`, ({ request }) => {
    const params = new URL(request.url).searchParams
    const from = params.get('from')
    const to = params.get('to')
    if (!from || !to) return problem(422, '요청 값이 올바르지 않습니다.')
    const adminId = params.get('adminId')
    const list = periodResolutionRequests.filter(
      (r) =>
        r.resolvedAt >= from && r.resolvedAt < to && (!adminId || String(r.adminId) === adminId),
    )
    return HttpResponse.json(pageOf(list, params))
  }),
  http.get(`${payouts}/deposit-checks`, ({ request }) =>
    HttpResponse.json(pageOf(depositChecks, new URL(request.url).searchParams)),
  ),
  http.get(`${payouts}/orders/:orderId/resolution-requests`, ({ params, request }) => {
    const list = resolutionRequests.filter((r) => r.orderId === Number(params.orderId))
    return HttpResponse.json(pageOf(list, new URL(request.url).searchParams))
  }),
  http.get(`${payouts}/orders/:orderId/resolutions`, ({ params, request }) => {
    const list = resolutions.filter((r) => r.orderId === Number(params.orderId))
    return HttpResponse.json(pageOf(list, new URL(request.url).searchParams))
  }),
  // 잠김·멈춤인 주문만 해결된다. 상태는 저장하지 않는다
  http.post(`${payouts}/orders/:orderId/resolution`, async ({ params, request }) => {
    const orderId = Number(params.orderId)
    const body = (await request.json()) as { memo?: string }
    const memo = body.memo?.trim() ?? ''
    if (!memo) {
      return problem(422, '요청 값이 올바르지 않습니다.', {
        errors: [{ path: 'memo', pointer: '/memo', detail: '해결 메모는 필수입니다.' }],
      })
    }
    const order = blockedOrders.find((o) => o.orderId === orderId)
    if (!order || order.status === PayoutBlockStatus.RESOLVED) {
      return problem(409, '해결할 잠금이나 멈춤이 없는 주문입니다.')
    }
    return HttpResponse.json(
      {
        resolutionRequestId: '9a1c2b3d-0000-4000-8000-000000000001',
        orderId,
        method: 'REPROCESS',
        adminId: 1,
        resolvedAt: now(),
        memo,
        resolvedFailureCount: order.causes.length,
      },
      { status: 201 },
    )
  }),
  // orderId면 기간 없이 그 주문의 후보 전부, 아니면 기간 필수(422)
  http.get(`${payouts}/candidates`, ({ request }) => {
    const params = new URL(request.url).searchParams
    const orderId = params.get('orderId')
    if (orderId) {
      const list = orderCandidates.filter((c) => String(c.orderId) === orderId)
      return HttpResponse.json(pageOf(list, params))
    }
    if (!params.get('from') || !params.get('to')) {
      return problem(422, '요청 값이 올바르지 않습니다.', {
        errors: [
          {
            path: 'periodPresentWithoutOrderId',
            pointer: '/periodPresentWithoutOrderId',
            detail: '주문 ID가 없으면 조회 시작 시각과 종료 시각은 필수입니다.',
          },
        ],
      })
    }
    const unsettledOnly = params.get('unsettledOnly') === 'true'
    const list = unsettledOnly
      ? adminPayoutCandidates.filter((c) => !c.settled)
      : adminPayoutCandidates
    return HttpResponse.json(pageOf(list, params))
  }),
  http.post(`${payouts}/run/skip-wait`, () =>
    HttpResponse.json({ executionId: 102, status: 'COMPLETED' }),
  ),
  http.post(`${payouts}/run/order-items/:orderItemId`, () => unsupported()),
  http.post(`${payouts}/run`, () => HttpResponse.json({ executionId: 101, status: 'COMPLETED' })),
  // 201 방금 저장한 조정. 원래 후보는 주문별 정산후보에서 찾고, 없으면 422
  http.post(`${payouts}/adjustments`, async ({ request }) => {
    const body = (await request.json()) as {
      orderItemId: number
      eventType: string
      amount: number
      reason: string
    }
    const original = orderCandidates.find(
      (c) => c.orderItemId === body.orderItemId && c.eventType === body.eventType && !c.adjustment,
    )
    if (!original) return problem(422, '조정할 원래 정산후보가 없습니다.')
    return HttpResponse.json(
      {
        candidateId: 49001,
        adjustmentId: 1,
        orderId: original.orderId,
        orderItemId: body.orderItemId,
        sellerId: original.sellerId,
        eventType: body.eventType,
        amount: body.amount,
        reason: body.reason.trim(),
        adminId: 1,
        createdAt: now(),
      },
      { status: 201 },
    )
  }),
  http.get(payouts, ({ request }) => {
    const params = new URL(request.url).searchParams
    const system = params.get('system')
    const payeeId = params.get('payeeId')
    const list = adminPayouts.filter((p) => {
      if (system === 'true' && !p.system) return false
      if (system === 'false' && p.system) return false
      if (payeeId && String(p.payeeId) !== payeeId) return false
      return true
    })
    return HttpResponse.json(pageOf(list, params))
  }),
  http.get(`${payouts}/:payoutId`, ({ params }) => {
    const detail = findPayoutDetail(Number(params.payoutId))
    return detail ? HttpResponse.json(detail) : problem(404, '정산을 찾을 수 없습니다.')
  }),
  http.get(`${payouts}/:payoutId/items`, ({ params, request }) => {
    const items = adminPayoutItems[Number(params.payoutId)]
    if (!items) return problem(404, '정산을 찾을 수 없습니다.')
    return HttpResponse.json(pageOf(items, new URL(request.url).searchParams))
  }),

  // ─── 리뷰 분석 테스트 ──────────────────────────────────
  http.post('*/api/v1/admin/review-analysis/keywords', () => HttpResponse.json(keywordAnalysis)),
  http.post('*/api/v1/admin/review-analysis/sentiment', () => HttpResponse.json(sentimentAnalysis)),

  // ─── 검색 점검 ─────────────────────────────────────────
  // 기간은 보지 않고 limit만큼 자른다. 기간 오류(400)는 테스트에서 덮는다
  http.get('*/api/v1/admin/product-search/zero-result-keywords', ({ request }) =>
    HttpResponse.json(zeroResultKeywords.slice(0, limitOf(request))),
  ),
  http.get('*/api/v1/admin/product-search/untagged-products', ({ request }) =>
    HttpResponse.json(untaggedProducts.slice(0, limitOf(request))),
  ),
]
