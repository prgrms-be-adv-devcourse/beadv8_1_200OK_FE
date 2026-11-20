import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { farmProducts, farmSellers } from './fixtures'
import { type FarmStore, FarmStoreView, type FarmStoreViewProps } from './views/FarmStoreView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다)
// ‘지금 화면’ 상태는 실제 라우트처럼 서버 응답(StoreProfile)만 넘긴다: 상품은 연결 전, 팔로워 수는 ‘–’, 팔로우는 비활성.
// 나머지는 API가 생겼을 때의 시안(지역·팔로워 수·판매 중지·상품 목록·팔로우 포함)이다.

const noop = () => {}
const [cheongsong] = farmSellers

/** 서버 응답에 있는 값만 */
const storeOnly: FarmStore | undefined = cheongsong && {
  sellerId: cheongsong.sellerId,
  storeName: cheongsong.storeName,
  representativeName: cheongsong.representativeName,
  customerServicePhone: cheongsong.customerServicePhone,
  introduction: cheongsong.introduction,
  profileImageUrl: cheongsong.profileImageUrl,
}

const current = (props: Partial<FarmStoreViewProps> = {}) => (
  <FarmStoreView status="success" seller={storeOnly} onRetry={noop} {...props} />
)

const store = (props: Partial<FarmStoreViewProps> = {}) => (
  <FarmStoreView
    status="success"
    seller={cheongsong}
    products={farmProducts[7] ?? []}
    onToggleFollow={noop}
    onToggleLike={noop}
    onRetry={noop}
    {...props}
  />
)

export const farmPreviews: ScreenPreview[] = [
  {
    id: 'farm-store',
    title: 'B-11 판매자 상점',
    layout: 'public',
    path: '/farms/7',
    mobileHeader: true,
    states: [
      { id: 'current', label: '지금 화면 (상점 프로필만 연결)', render: () => current() },
      {
        id: 'current-minimal',
        label: '지금 화면 · 소개·사진 없음',
        render: () =>
          current({
            seller: storeOnly && { ...storeOnly, introduction: null, profileImageUrl: null },
          }),
      },
      {
        id: 'current-owner',
        label: '지금 화면 · 내 상점',
        session: 'seller',
        render: () => current({ isOwner: true }),
      },
      { id: 'loading', label: '로딩', render: () => current({ status: 'pending' }) },
      {
        id: 'error',
        label: '불러오기 실패',
        render: () =>
          current({
            status: 'error',
            seller: undefined,
            errorMessage: '지금은 상점 정보를 볼 수 없어요. 잠시 뒤 다시 시도해 주세요.',
          }),
      },
      {
        id: 'not-found',
        label: '없는 상점 (404)',
        render: () => current({ status: 'notFound', seller: undefined }),
      },
      { id: 'default', label: '시안 · 기본', render: () => store() },
      { id: 'following', label: '시안 · 팔로잉', render: () => store({ following: true }) },
      {
        id: 'suspended',
        label: '시안 · 정지된 판매자',
        render: () => store({ seller: cheongsong && { ...cheongsong, suspended: true } }),
      },
      {
        id: 'owner',
        label: '시안 · 내 상점',
        session: 'seller',
        render: () => store({ isOwner: true }),
      },
      {
        id: 'guest',
        label: '시안 · 비회원 팔로우 → 로그인',
        session: 'guest',
        render: () => store({ loginPrompt: 'follow' }),
      },
      { id: 'no-products', label: '시안 · 상품 없음', render: () => store({ products: [] }) },
    ],
  },
]
