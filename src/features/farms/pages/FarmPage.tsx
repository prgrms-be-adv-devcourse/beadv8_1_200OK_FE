import { useSyncExternalStore } from 'react'
import { useParams } from 'react-router'
import { isApiError } from '@/shared/api/ApiError'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import { isStoreNotFound } from '@/shared/api/storeProfile'
import { MemberRole } from '@/shared/api/types'
import { useStoreProfile } from '../queries'
import { FarmStoreView, type FarmStoreViewProps } from '../views/FarmStoreView'

// B-11 판매자 상점 라우트 /farms/:farmId. farmId는 판매자의 회원 번호(sellerId)다.
// ✅ 상점 프로필 GET /stores/{sellerId}. 잘못된 번호·404(상점 프로필 없음)는 ‘상점을 찾을 수 없어요’.
// 내 상점 여부는 토큰의 회원 번호로 판단한다(sellerId = 회원 번호).
// TODO(api): ❌ 판매자별 상품 목록(GET /products에 sellerId 없음) → 상품 영역은 ‘연결 전’,
//   📝 팔로우 PUT/DELETE /members/me/followings/{sellerId} → 버튼을 막고 이유를 보인다,
//   ❌ 지역·팔로워 수·판매 중지 여부 → 지역은 빼고 팔로워 수는 ‘–’.

const UNAVAILABLE_MESSAGE = '지금은 상점 정보를 볼 수 없어요. 잠시 뒤 다시 시도해 주세요.'

const asSellerId = (value: string | undefined) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function errorMessageOf(error: unknown): string | undefined {
  if (!isApiError(error)) return undefined
  // 서버에 경로가 아직 없을 때의 404는 Spring 내부 문구라 대신 안내한다
  if (error.status === 404) return UNAVAILABLE_MESSAGE
  return error.detail
}

export function FarmPage() {
  const { farmId } = useParams()
  const sellerId = asSellerId(farmId)
  const store = useStoreProfile(sellerId)
  const auth = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)

  const status: FarmStoreViewProps['status'] =
    sellerId === null || isStoreNotFound(store.error)
      ? 'notFound'
      : store.data
        ? 'success'
        : store.status

  return (
    <FarmStoreView
      status={status}
      seller={store.data}
      isOwner={auth?.role === MemberRole.SELLER && auth.memberId === sellerId}
      errorMessage={errorMessageOf(store.error)}
      onRetry={() => void store.refetch()}
    />
  )
}
