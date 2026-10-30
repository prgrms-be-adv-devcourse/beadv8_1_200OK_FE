import { HttpResponse, http } from 'msw'
import {
  myProfile,
  mySellerProducts,
  payoutCandidates,
  payoutDetails,
  payoutItems,
  payouts,
  sellerProductDetail101,
  sellerShipmentDetails,
  sellerShipments,
  sellerWalletBalance,
} from '@/features/seller/fixtures'
import type { SellerProfileRequest } from '@/shared/api/types'
import { pageOf, problem } from './_shared'

// 판매자 내 상품·프로필·잔액·정산(/payouts/me) 기본 응답 (seller fixtures). 실패·등록 전(404)은 테스트에서 server.use(...)로 덮는다.
// 순서: /payouts/me/candidates 가 /payouts/me/:id 보다 앞이어야 한다.

export const sellerHandlers = [
  http.get('*/api/v1/sellers/me/products', ({ request }) => {
    const params = new URL(request.url).searchParams
    const status = params.get('status')
    const visibility = params.get('visibility')
    const list = mySellerProducts.filter(
      (p) => (!status || p.status === status) && (!visibility || p.visibility === visibility),
    )
    return HttpResponse.json(pageOf(list, params))
  }),
  http.get('*/api/v1/sellers/me/products/:productId', ({ params }) =>
    Number(params.productId) === sellerProductDetail101.productId
      ? HttpResponse.json(sellerProductDetail101)
      : problem(404, '상품을 찾을 수 없습니다.'),
  ),
  http.patch('*/api/v1/products/:productId/status', () => new HttpResponse(null, { status: 204 })),
  http.patch(
    '*/api/v1/products/:productId/visibility',
    () => new HttpResponse(null, { status: 204 }),
  ),

  // 출고 목록(25건 고정)·상세·송장·배송지 변경 처리. 실패(409 등)는 테스트에서 덮는다
  http.get('*/api/v1/seller/shipments', ({ request }) =>
    HttpResponse.json(pageOf(sellerShipments, new URL(request.url).searchParams, 25)),
  ),
  http.get('*/api/v1/seller/shipments/:shipmentId', ({ params }) => {
    const detail = sellerShipmentDetails.find((s) => s.shipmentId === Number(params.shipmentId))
    return detail ? HttpResponse.json(detail) : problem(404, '배송을 찾을 수 없습니다.')
  }),
  http.post('*/api/v1/seller/shipments/:shipmentId/dispatch', async ({ params, request }) => {
    const body = (await request.json()) as { carrier: string; trackingNumber: string }
    return HttpResponse.json({
      shipmentId: Number(params.shipmentId),
      status: 'SHIPPING',
      ...body,
      shippedAt: '2026-10-19T15:00:00',
    })
  }),
  http.patch(
    '*/api/v1/seller/shipments/:shipmentId/address-change-requests/:requestId',
    async ({ params, request }) => {
      const { decision } = (await request.json()) as { decision: 'APPROVE' | 'REJECT' }
      return HttpResponse.json({
        requestId: Number(params.requestId),
        shipmentId: Number(params.shipmentId),
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        additionalFeeNotice: 3000,
        rejectReason:
          decision === 'REJECT' ? '상품 준비가 완료되어 배송지 변경이 불가능합니다.' : null,
        requestedAt: '2026-10-18T12:10:00',
        processedAt: '2026-10-19T09:00:00',
      })
    },
  ),

  http.get('*/api/v1/sellers/me/profile', () => HttpResponse.json(myProfile)),
  http.post('*/api/v1/sellers/me/profile', async ({ request }) => {
    const body = (await request.json()) as SellerProfileRequest
    return HttpResponse.json(
      {
        ...body,
        introduction: body.introduction ?? null,
        profileImageUrl: body.profileImageUrl ?? null,
      },
      { status: 201 },
    )
  }),
  http.put('*/api/v1/sellers/me/profile', async ({ request }) => {
    const body = (await request.json()) as SellerProfileRequest
    return HttpResponse.json({
      ...body,
      introduction: body.introduction ?? null,
      profileImageUrl: body.profileImageUrl ?? null,
    })
  }),

  http.get('*/api/v1/wallets/sellers/me/balance', () =>
    HttpResponse.json({ balance: sellerWalletBalance }),
  ),

  http.get('*/api/v1/payouts/me', ({ request }) =>
    HttpResponse.json(pageOf(payouts, new URL(request.url).searchParams)),
  ),
  http.get('*/api/v1/payouts/me/candidates', ({ request }) => {
    const params = new URL(request.url).searchParams
    const list =
      params.get('unsettledOnly') === 'true'
        ? payoutCandidates.filter((c) => !c.settled)
        : payoutCandidates
    return HttpResponse.json(pageOf(list, params))
  }),
  http.get('*/api/v1/payouts/me/:payoutId', ({ params }) => {
    const detail = payoutDetails.find((p) => p.payoutId === Number(params.payoutId))
    return detail ? HttpResponse.json(detail) : problem(404, '정산을 찾을 수 없습니다.')
  }),
  http.get('*/api/v1/payouts/me/:payoutId/items', ({ request, params }) => {
    const items = payoutItems[Number(params.payoutId)]
    if (!items) return problem(404, '정산을 찾을 수 없습니다.')
    return HttpResponse.json(pageOf(items, new URL(request.url).searchParams))
  }),
]
