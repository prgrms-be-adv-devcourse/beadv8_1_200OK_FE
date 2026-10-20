import { HttpResponse, http } from 'msw'
import {
  adminPayoutCandidates,
  adminPayoutItems,
  adminPayouts,
  findApplication,
  findPayoutDetail,
  sellerApplicationSummaries,
} from '@/features/admin/fixtures'
import { SellerApplicationStatus } from '@/shared/api/types'
import { pageOf, problem } from './_shared'

// 관리자 판매자 심사·정산 기본 응답 (admin fixtures). 실패 시나리오는 테스트에서 server.use(...)로 덮는다.
// 처리(review·approve·reject)는 상태를 저장하지 않고 ‘처리 뒤 상세’ 모양만 돌려준다.

const applications = '*/api/v1/admin/seller-applications'
const payouts = '*/api/v1/admin/payouts'

const now = () => '2026-10-18T14:20:00'
const notFoundApplication = problem(404, '판매자 신청을 찾을 수 없습니다.')
const unsupported = () => problem(501, '아직 지원하지 않는 기능입니다.')

const detailOf = (id: string) => findApplication(Number(id))

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
  // candidates · run · adjustments는 /:payoutId보다 먼저 둔다
  http.get(`${payouts}/candidates`, ({ request }) => {
    const params = new URL(request.url).searchParams
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
  http.post(`${payouts}/adjustments`, () => unsupported()),
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
]
