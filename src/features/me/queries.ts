import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { clearAccessToken } from '@/shared/api/authToken'
import { defaultAddressQueryOptions, saveDefaultAddress } from '@/shared/api/defaultAddress'
import { myInfoQueryOptions, updateMyInfo } from '@/shared/api/memberInfo'
import type {
  MemberInfo,
  MemberInfoUpdateRequest,
  PasswordChangeRequest,
  ShipmentAddress,
  ShipmentAddressRequest,
} from '@/shared/api/types'
import { changePassword } from './api'

// 내 정보·기본 배송지 수정. 성공하면 서버가 돌려준 값을 내 정보 캐시에 넣어 마이페이지·상단 이름이 바로 바뀐다.

export function useUpdateMyInfo() {
  const queryClient = useQueryClient()
  return useMutation<MemberInfo, ApiError | Error, MemberInfoUpdateRequest>({
    mutationFn: updateMyInfo,
    onSuccess: (info) => queryClient.setQueryData(myInfoQueryOptions().queryKey, info),
  })
}

// 비밀번호 변경. 성공(204)하면 서버가 이 세션의 Access·Refresh 토큰을 모두 무효로 만들었으므로 바로 세션을 끝낸다
// (재발급해도 거절된다). onChanged(로그인 화면으로 이동·안내)는 화면이 넘긴다.
// mutate()에 넘긴 콜백은 세션이 끝나 가드가 화면을 내리면 불리지 않을 수 있어 훅 옵션의 onSuccess에서 같이 부른다.
export function useChangePassword(onChanged: () => void) {
  return useMutation<void, ApiError | Error, PasswordChangeRequest>({
    mutationFn: changePassword,
    onSuccess: () => {
      clearAccessToken('logout')
      onChanged()
    },
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
