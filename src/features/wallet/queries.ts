import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ApiError, isApiError } from '@/shared/api/ApiError'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import type { TermsAgreeRequest } from '@/shared/api/types'
import { agreeWalletTerms, fetchWalletTerms } from './api'

// 지갑 쿼리 키·훅. 키는 [wallet, ...]로 시작한다. 지금은 충전 약관만 있다.

export const walletKeys = {
  all: [queryKeyPrefix.wallet] as const,
  terms: () => [queryKeyPrefix.wallet, 'terms'] as const,
}

export const walletTermsQueryOptions = () =>
  queryOptions({
    queryKey: walletKeys.terms(),
    queryFn: fetchWalletTerms,
    select: (response) => response.terms,
  })

/** 충전 약관(현재 버전 + 동의 여부). 로그인했을 때만 부른다(enabled) */
export function useWalletTerms(enabled = true) {
  return useQuery({ ...walletTermsQueryOptions(), enabled })
}

/** 약관 동의. 성공하거나 409(약관이 바뀜)면 약관을 다시 받는다 → 바뀐 약관으로 다시 동의 시트를 띄울 수 있다 */
export function useAgreeWalletTerms() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError | Error, TermsAgreeRequest>({
    mutationFn: agreeWalletTerms,
    onSettled: (_data, error) => {
      if (!error || (isApiError(error) && error.status === 409)) {
        void queryClient.invalidateQueries({ queryKey: walletKeys.terms() })
      }
    },
  })
}

/** 화면에 보여 줄 약관 오류 문구. 서버 detail을 우선한다 */
export function termsErrorMessage(error: unknown): string {
  return isApiError(error)
    ? (error.errors[0]?.detail ?? error.detail)
    : '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'
}
