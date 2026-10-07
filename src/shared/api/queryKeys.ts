/**
 * 쿼리키 접두어 계약(ADR-0003).
 * 각 feature의 키 팩토리(productKeys 등)는 이 접두어로 시작하고, 다른 feature의 캐시를 무효화할 때는
 * 접두어만 사용한다. 예: seller가 상품 저장 후 queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX.products] })
 */
export const QUERY_KEY_PREFIX = {
  auth: 'auth',
  products: 'products',
  farms: 'farms',
  cart: 'cart',
  orders: 'orders',
  seller: 'seller',
} as const

export type QueryKeyPrefix = (typeof QUERY_KEY_PREFIX)[keyof typeof QUERY_KEY_PREFIX]
