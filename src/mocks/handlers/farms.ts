import { HttpResponse, http } from 'msw'
import { farmSellers } from '@/features/farms/fixtures'
import type { StoreProfile } from '@/shared/api/types'
import { problem } from './_shared'

// 상점 프로필 기본 응답: fixtures의 농가(7·8)만 있고 나머지는 404(SELLER_PROFILE_NOT_FOUND).
// 응답에는 서버 계약(StoreProfile)에 있는 값만 담는다(지역·팔로워 수·판매 중지는 서버에 없다).

const stores: StoreProfile[] = farmSellers.map(
  ({
    sellerId,
    storeName,
    representativeName,
    customerServicePhone,
    introduction,
    profileImageUrl,
  }) => ({
    sellerId,
    storeName,
    representativeName,
    customerServicePhone,
    introduction,
    profileImageUrl,
  }),
)

export const farmsHandlers = [
  http.get('*/api/v1/stores/:sellerId', ({ params }) => {
    const store = stores.find((item) => item.sellerId === Number(params.sellerId))
    return store
      ? HttpResponse.json(store)
      : problem(404, '판매자 프로필을 찾을 수 없습니다.', { code: 'SELLER_PROFILE_NOT_FOUND' })
  }),
]
