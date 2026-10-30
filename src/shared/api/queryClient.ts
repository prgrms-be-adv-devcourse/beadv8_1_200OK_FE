import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './ApiError'

// 앱 전체 QueryClient. 화면별 staleTime은 각 feature 쿼리에서 정한다(상품 60초, 장바구니·주문 0 등).
// 4xx는 다시 해도 같은 결과라 재시도하지 않고, 네트워크·5xx만 한 번 더 시도한다. 변경 요청은 재시도하지 않는다.

function shouldRetry(failureCount: number, error: unknown) {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false
  return failureCount < 1
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry },
      mutations: { retry: false },
    },
  })
}

export const queryClient = createQueryClient()
