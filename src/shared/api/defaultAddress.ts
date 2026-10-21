import { queryOptions, useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { getAuthSession, subscribeAuth } from './authToken'
import { apiClient } from './client'
import { queryKeyPrefix } from './queryKeys'
import {
  MemberRole,
  type ShipmentAddress,
  type ShipmentAddressRequest,
  type ShippingAddress,
} from './types'

// 구매자 기본 배송지(회원당 1개)는 checkout(주문서 처음 값)과 me(계정 관리·마이페이지)가 함께 써서 shared에 둔다(ADR-0003).
// 구매자 API라 관리자(ADMIN 단독 토큰)는 못 부른다. 승인된 판매자는 BUYER 권한도 함께 받아 부를 수 있다 → 조회 훅은 BUYER·SELLER일 때만 요청한다.

// ✅ GET /api/v1/shipments/addresses/default → 200 AddressResponse, 204 = 등록한 기본 배송지 없음(오류 아님 → null)
export async function fetchDefaultAddress(): Promise<ShipmentAddress | null> {
  const response = await apiClient.get<ShipmentAddress | ''>('/api/v1/shipments/addresses/default')
  return response.status === 204 || !response.data ? null : response.data
}

// ✅ PUT /api/v1/shipments/addresses/default → 200 저장된 값. 없으면 등록·있으면 수정. 이미 만든 주문·배송의 배송지는 안 바뀐다.
// 422 검증 실패(errors[].path = recipientName · recipientPhone · postalCode · address · addressDetail)
export async function saveDefaultAddress(body: ShipmentAddressRequest): Promise<ShipmentAddress> {
  const { data } = await apiClient.put<ShipmentAddress>('/api/v1/shipments/addresses/default', body)
  return data
}

export const defaultAddressQueryOptions = () =>
  queryOptions({
    queryKey: [queryKeyPrefix.addresses, 'default'] as const,
    queryFn: fetchDefaultAddress,
    staleTime: 60_000,
  })

/** 내 기본 배송지. BUYER·SELLER가 아니면(관리자) 요청하지 않는다(isPending이 계속 true이므로 enabled를 같이 본다) */
export function useDefaultAddress() {
  const role = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)?.role
  const enabled = role === MemberRole.BUYER || role === MemberRole.SELLER
  return { ...useQuery({ ...defaultAddressQueryOptions(), enabled }), enabled }
}

/** 서버는 숫자만 내려준다. 화면 입력 규칙(010-1234-5678)에 맞춰 하이픈을 붙인다 */
export function formatPhone(digits: string): string {
  const value = digits.replace(/\D/g, '')
  if (value.length === 11) return `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`
  if (value.length === 10) return `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`
  return digits
}

/** 서버 배송지 → 주문서·계정 화면의 배송지 모양 */
export function toShippingAddress(address: ShipmentAddress): ShippingAddress {
  return {
    recipientName: address.recipientName,
    recipientPhone: formatPhone(address.recipientPhone),
    zipCode: address.postalCode,
    address: address.address,
    addressDetail: address.addressDetail,
  }
}

/** 화면 배송지 → 저장 요청. 화면에 없는 배송 요청사항은 서버에 있던 값을 그대로 둔다 */
export function toAddressRequest(
  address: ShippingAddress,
  deliveryNote?: string | null,
): ShipmentAddressRequest {
  return {
    recipientName: address.recipientName,
    recipientPhone: address.recipientPhone,
    postalCode: address.zipCode,
    address: address.address,
    addressDetail: address.addressDetail ?? '',
    ...(deliveryNote ? { deliveryNote } : {}),
  }
}
