import { QueryClient } from '@tanstack/react-query'
import { type ApiError, isApiError } from './error'

declare module '@tanstack/react-query' {
  interface Register {
    /** apiClient는 항상 ApiError로 reject하므로 useQuery·useMutation의 error 타입을 고정한다. */
    defaultError: ApiError
  }
}

/** 응답이 없는 오류(네트워크·타임아웃)와 5xx만 재시도한다. 4xx는 다시 보내도 결과가 같다. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.isClientError) {
    return false
  }
  return failureCount < 2
}

/**
 * 앱 전역 QueryClient(ADR-0002).
 * staleTime 기본 0. 상품·농가처럼 60초가 필요한 쿼리는 각 feature의 queryOptions에서 지정한다.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
})
