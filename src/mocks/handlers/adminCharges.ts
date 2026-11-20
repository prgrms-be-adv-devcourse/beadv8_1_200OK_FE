import { HttpResponse, http } from 'msw'
import { adminCharges, findChargeDetail } from '@/features/admin/fixtures'
import { ChargeStatus } from '@/shared/api/types'
import { problem } from './_shared'

// 관리자 멈춘 충전 건 기본 응답 (admin fixtures). 처리는 상태를 저장하지 않고 ‘처리 뒤 충전 건’ 모양만 돌려준다.
// 409·503 같은 실패 시나리오는 테스트에서 server.use(...)로 덮는다.

const charges = '*/api/v1/admin/wallets/charges'

const now = () => '2026-11-20T10:00:00'
const notFound = () => problem(404, '충전 내역을 찾을 수 없습니다.')
const reasonRequired = () =>
  problem(422, '요청 값이 올바르지 않습니다.', {
    errors: [{ path: 'reason', pointer: '/reason', detail: '사유는 필수입니다.' }],
  })

const reasonOf = async (request: Request) =>
  ((await request.json()) as { reason?: string }).reason?.trim() ?? ''

export const adminChargeHandlers = [
  http.get(charges, () => HttpResponse.json(adminCharges)),
  http.get(`${charges}/:chargeNo`, ({ params }) => {
    const detail = findChargeDetail(params.chargeNo as string)
    return detail ? HttpResponse.json(detail) : notFound()
  }),
  http.post(`${charges}/:chargeNo/complete`, ({ params }) => {
    const detail = findChargeDetail(params.chargeNo as string)
    if (!detail) return notFound()
    return HttpResponse.json({ ...detail.charge, status: ChargeStatus.COMPLETED })
  }),
  http.post(`${charges}/:chargeNo/fail`, async ({ params, request }) => {
    const detail = findChargeDetail(params.chargeNo as string)
    if (!detail) return notFound()
    const reason = await reasonOf(request)
    if (!reason) return reasonRequired()
    return HttpResponse.json({
      ...detail.charge,
      status: ChargeStatus.FAILED,
      failureCode: 'ADMIN_FAILED',
      failureMessage: reason,
    })
  }),
  http.post(`${charges}/:chargeNo/cancel-payment`, async ({ params, request }) => {
    const detail = findChargeDetail(params.chargeNo as string)
    if (!detail) return notFound()
    const reason = await reasonOf(request)
    if (!reason) return reasonRequired()
    const { charge } = detail
    const held = charge.status === ChargeStatus.IN_PROGRESS
    return HttpResponse.json({
      ...charge,
      status: ChargeStatus.FAILED,
      failureCode: held ? 'PAYMENT_CANCELED' : charge.failureCode,
      failureMessage: held ? reason : charge.failureMessage,
      paymentCanceledAt: now(),
    })
  }),
]
