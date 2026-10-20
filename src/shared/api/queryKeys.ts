// 쿼리 키 접두어 계약. 키 팩토리(productKeys 등)는 각 feature가 소유하고, 첫 칸만 여기 접두어를 쓴다.
// 다른 feature의 캐시를 비울 때는 키 팩토리를 import하지 않고 접두어로 무효화한다(ADR-0003):
//   queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.products] })

export const queryKeyPrefix = {
  products: 'products',
  farms: 'farms',
  cart: 'cart',
  checkout: 'checkout',
  orders: 'orders',
  shipments: 'shipments',
  wallet: 'wallet',
  reviews: 'reviews',
  media: 'media',
  members: 'members',
  seller: 'seller',
  sellerApply: 'sellerApply',
  payouts: 'payouts',
  admin: 'admin',
} as const

export type QueryKeyPrefix = (typeof queryKeyPrefix)[keyof typeof queryKeyPrefix]
