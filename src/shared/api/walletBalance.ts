import { queryOptions } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeyPrefix } from './queryKeys'
import type { BuyerBalance } from './types'

// 예치금 잔액은 wallet · checkout(주문서) · me(마이페이지)가 함께 써서 shared로 올렸다(ADR-0003).
// 키는 wallet의 키 팩토리(walletKeys.balance)와 같은 모양이라 캐시를 나눠 쓴다. 금액은 늘 새로 받는다(staleTime 0).

// ✅ GET /api/v1/wallets/me/balance. 지갑이 없으면 balance 0. 충전 가능 금액 = maxBalance − balance
export async function fetchWalletBalance(): Promise<BuyerBalance> {
  const { data } = await apiClient.get<BuyerBalance>('/api/v1/wallets/me/balance')
  return data
}

export const walletBalanceQueryOptions = () =>
  queryOptions({
    queryKey: [queryKeyPrefix.wallet, 'balance'] as const,
    queryFn: fetchWalletBalance,
    staleTime: 0,
  })
