import { HttpResponse, http } from 'msw'
import type { ShippingFeeQuoteRequest } from '@/shared/api/types'

// 배송비 견적 기본 응답: 요청한 판매자 그대로 기본 배송비 0 · 추가 운임 0(일반 지역). 도서산간·422는 테스트에서 덮는다

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
]
