import { HttpResponse, http } from 'msw'
import { myRefunds } from '@/features/orders/fixtures'
import { sellerRefunds } from '@/features/seller/fixtures'
import { type Refund, type RefundCreateRequest, RefundStatus } from '@/shared/api/refund'
import { pageOf, problem } from './_shared'

// 취소 요청(환불) 기본 응답. 구매자는 orders fixtures, 판매자는 seller fixtures. 25건 고정 페이지.
// 409·422 같은 실패는 테스트에서 server.use(...)로 덮는다.

const PAGE_SIZE = 25
const now = '2026-10-20T10:00:00'

export const refundsHandlers = [
  http.get('*/api/v1/refunds', ({ request }) =>
    HttpResponse.json(pageOf(myRefunds, new URL(request.url).searchParams, PAGE_SIZE)),
  ),
  http.post('*/api/v1/refunds', async ({ request }) => {
    const body = (await request.json()) as RefundCreateRequest
    const created: Refund = {
      refundId: 99,
      orderId: body.orderId,
      orderItemId: body.orderItemId,
      productName: '청송 꿀사과 부사',
      optionName: '2kg (11~13과)',
      quantity: body.quantity,
      unitPrice: 23900,
      itemAmount: 23900 * body.quantity,
      shippingFeeAmount: 0,
      remoteAreaFeeAmount: 0,
      deductedShippingFeeAmount: 0,
      refundAmount: 23900 * body.quantity,
      cancelReason: body.cancelReason ?? null,
      status: RefundStatus.REQUESTED,
      rejectReason: null,
      requestedAt: now,
      decidedAt: null,
      completedAt: null,
    }
    return HttpResponse.json(created, { status: 201 })
  }),
  http.post('*/api/v1/refunds/:refundId/withdraw', ({ params }) => {
    const found = myRefunds.find((r) => r.refundId === Number(params.refundId))
    if (!found) return problem(404, '환불 요청을 찾을 수 없습니다.')
    if (found.status !== RefundStatus.REQUESTED) {
      return problem(409, '요청됨 상태의 환불만 처리할 수 있습니다.')
    }
    return HttpResponse.json({ ...found, status: RefundStatus.WITHDRAWN, decidedAt: now })
  }),
  http.get('*/api/v1/seller/refunds', ({ request }) => {
    const searchParams = new URL(request.url).searchParams
    const status = searchParams.get('status')
    const rows = status ? sellerRefunds.filter((r) => r.status === status) : sellerRefunds
    return HttpResponse.json(pageOf(rows, searchParams, PAGE_SIZE))
  }),
  http.patch('*/api/v1/seller/refunds/:refundId', async ({ params, request }) => {
    const body = (await request.json()) as { decision: string; rejectReason?: string }
    const found = sellerRefunds.find((r) => r.refundId === Number(params.refundId))
    if (body.decision === 'REJECT' && !body.rejectReason?.trim()) {
      return problem(422, '거절 사유는 필수입니다.')
    }
    if (!found) return problem(404, '환불 요청을 찾을 수 없습니다.')
    if (found.status !== RefundStatus.REQUESTED) {
      return problem(409, '요청됨 상태의 환불만 처리할 수 있습니다.')
    }
    return HttpResponse.json(
      body.decision === 'APPROVE'
        ? { ...found, status: RefundStatus.PROCESSING, decidedAt: now }
        : {
            ...found,
            status: RefundStatus.REJECTED,
            rejectReason: body.rejectReason,
            decidedAt: now,
          },
    )
  }),
]
