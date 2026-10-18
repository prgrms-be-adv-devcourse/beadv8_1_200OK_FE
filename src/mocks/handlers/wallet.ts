import { HttpResponse, http } from 'msw'
import { walletTerms } from '@/features/wallet/fixtures'

// 충전 약관 조회·동의 기본 응답 (wallet fixtures, 모두 동의 전). 409 약관 개정·422는 테스트에서 덮는다.

export const walletHandlers = [
  http.get('*/api/v1/wallets/me/terms', () => HttpResponse.json({ terms: walletTerms })),
  http.post('*/api/v1/wallets/me/terms/agreements', () => new HttpResponse(null, { status: 204 })),
]
