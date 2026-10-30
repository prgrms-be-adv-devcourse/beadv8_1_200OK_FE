import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { farmProducts, farmSellers } from './fixtures'
import { FarmStoreView, type FarmStoreViewProps } from './views/FarmStoreView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다)

const noop = () => {}
const [cheongsong] = farmSellers

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
      {
        id: 'not-connected',
        label: '연결 전 (지금 화면)',
        render: () => <FarmStoreView status="notConnected" />,
      },
      { id: 'default', label: '기본', render: () => store() },
      { id: 'following', label: '팔로잉', render: () => store({ following: true }) },
      {
        id: 'suspended',
        label: '정지된 판매자',
        render: () => store({ seller: cheongsong && { ...cheongsong, suspended: true } }),
      },
      { id: 'owner', label: '내 상점', session: 'seller', render: () => store({ isOwner: true }) },
      {
        id: 'guest',
        label: '비회원 팔로우 → 로그인',
        session: 'guest',
        render: () => store({ loginPrompt: 'follow' }),
      },
      { id: 'no-products', label: '상품 없음', render: () => store({ products: [] }) },
      { id: 'loading', label: '로딩', render: () => store({ status: 'pending' }) },
      { id: 'error', label: '불러오기 실패', render: () => store({ status: 'error' }) },
      {
        id: 'not-found',
        label: '없는 상점',
        render: () => store({ status: 'notFound', seller: undefined }),
      },
    ],
  },
]
