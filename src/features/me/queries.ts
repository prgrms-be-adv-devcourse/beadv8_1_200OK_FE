import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { defaultAddressQueryOptions, saveDefaultAddress } from '@/shared/api/defaultAddress'
import { myInfoQueryOptions, updateMyInfo } from '@/shared/api/memberInfo'
import type {
  MemberInfo,
  MemberInfoUpdateRequest,
  ShipmentAddress,
  ShipmentAddressRequest,
} from '@/shared/api/types'

// 내 정보·기본 배송지 수정. 성공하면 서버가 돌려준 값을 내 정보 캐시에 넣어 마이페이지·상단 이름이 바로 바뀐다.

export function useUpdateMyInfo() {
  const queryClient = useQueryClient()
  return useMutation<MemberInfo, ApiError | Error, MemberInfoUpdateRequest>({
    mutationFn: updateMyInfo,
    onSuccess: (info) => queryClient.setQueryData(myInfoQueryOptions().queryKey, info),
  })
}

// 기본 배송지 저장(등록·수정). 성공하면 서버가 돌려준 값을 캐시에 넣어 주문서·마이페이지가 바로 바뀐다.
export function useSaveDefaultAddress() {
  const queryClient = useQueryClient()
  return useMutation<ShipmentAddress, ApiError | Error, ShipmentAddressRequest>({
    mutationFn: saveDefaultAddress,
    onSuccess: (address) =>
      queryClient.setQueryData(defaultAddressQueryOptions().queryKey, address),
  })
}
