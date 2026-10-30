import { HttpResponse, http } from 'msw'
import type { ShipmentAddress, ShipmentAddressRequest } from '@/shared/api/types'

// 기본 배송지 기본 응답: 미등록(204). 등록된 경우·422·403은 테스트에서 server.use로 덮는다.
// PUT은 보낸 값을 숫자만 남긴 연락처로 돌려준다(서버는 숫자만 저장).

export const sampleDefaultAddress: ShipmentAddress = {
  recipientName: '이서연',
  recipientPhone: '01024681357',
  postalCode: '04524',
  address: '서울 중구 세종대로 110',
  addressDetail: '3층 301호',
  deliveryNote: '문 앞에 놓아 주세요',
}

export const addressesHandlers = [
  http.get('*/api/v1/shipments/addresses/default', () => new HttpResponse(null, { status: 204 })),
  http.put('*/api/v1/shipments/addresses/default', async ({ request }) => {
    const body = (await request.json()) as ShipmentAddressRequest
    return HttpResponse.json({
      ...body,
      recipientPhone: body.recipientPhone.replace(/\D/g, ''),
      deliveryNote: body.deliveryNote ?? null,
    })
  }),
]
