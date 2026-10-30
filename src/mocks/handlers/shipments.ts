import { HttpResponse, http } from 'msw'
import { shipmentDetails, shipmentSummaries } from '@/features/orders/fixtures'
import type { ShippingFeeQuoteRequest } from '@/shared/api/types'
import { pageOf, problem } from './_shared'

// 배송비 견적 기본 응답: 요청한 판매자 그대로 기본 배송비 0 · 추가 운임 0(일반 지역). 도서산간·422는 테스트에서 덮는다.
// 내 배송 목록(25건 고정)·상세는 orders fixtures. 없는 배송은 404 "배송을 찾을 수 없습니다."(문구는 서버 확인 전 임시)

export const shipmentsHandlers = [
  http.post('*/api/v1/shipments/fee-quotes', async ({ request }) => {
    const { sellers } = (await request.json()) as ShippingFeeQuoteRequest
    return HttpResponse.json({
      regionGroup: 'GENERAL',
      sellers: sellers.map(({ sellerId }) => ({
        sellerId,
        baseShippingFee: 0,
        regionSurcharge: 0,
        shippingFee: 0,
        expectedShipDate: '2026-10-21',
        arrivalStartDate: '2026-10-23',
        arrivalEndDate: '2026-10-26',
      })),
      totalShippingFee: 0,
    })
  }),
  http.get('*/api/v1/shipments', ({ request }) =>
    HttpResponse.json(pageOf(shipmentSummaries, new URL(request.url).searchParams, 25)),
  ),
  http.get('*/api/v1/shipments/:shipmentId', ({ params }) => {
    const raw = String(params.shipmentId)
    if (!/^\d+$/.test(raw)) return undefined
    const shipment = shipmentDetails.find((s) => s.shipmentId === Number(raw))
    return shipment ? HttpResponse.json(shipment) : problem(404, '배송을 찾을 수 없습니다.')
  }),
]
