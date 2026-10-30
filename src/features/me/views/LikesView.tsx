import { Button, Stack, Tabs } from '@mantine/core'
import { Heart, Store } from 'lucide-react'
import { formatAmount } from '@/shared/lib/format'
import { ProductSaleState } from '@/shared/lib/productState'
import {
  FarmCard,
  NotConnected,
  NotConnectedValue,
  PageHeader,
  ProductCard,
  type ProductCardItem,
  ProductGrid,
  ProductGridSkeleton,
  QueryState,
  StatusBadge,
} from '@/shared/ui'
import type { FollowedFarm } from '../types'
import classes from './LikesView.module.css'

// B-14 관심 상품 · 팔로우한 농가 /me/likes?tab=products|farms. 시안: b2c/Likes, LikesMobile
// 상품: 일시 품절·판매 종료는 카드 막으로 흐리게, 하트를 누르면 관심에서 뺀다. 농가: 판매 중지 배지, 팔로잉 취소.
// TODO(api): 📝 wishlist 조회·삭제, followings 조회·언팔로우 API 없음.
//   지금 라우트는 status 'notConnected'로 두 탭 모두 ‘연결 전’만 그린다(개수는 ‘–’). 목록 상태는 /__design 시안용.

export type LikesTab = 'products' | 'farms'

export type LikesViewProps = {
  /** notConnected: 관심·팔로우 API가 없어 ‘연결 전’만 그린다 */
  status: 'pending' | 'error' | 'success' | 'notConnected'
  tab: LikesTab
  onTabChange: (tab: LikesTab) => void
  products?: ProductCardItem[]
  farms?: FollowedFarm[]
  onUnlike?: (productId: number) => void
  onUnfollow?: (sellerId: number) => void
  onRetry?: () => void
}

export function LikesView({
  status,
  tab,
  onTabChange,
  products = [],
  farms = [],
  onUnlike,
  onUnfollow,
  onRetry,
}: LikesViewProps) {
  const title = tab === 'products' ? '관심 상품' : '팔로우한 농가'
  const isEmpty = tab === 'products' ? products.length === 0 : farms.length === 0
  const notConnected = status === 'notConnected'
  const count = (n: number) => (notConnected ? <NotConnectedValue /> : formatAmount(n))

  return (
    <div className={classes.root}>
      <PageHeader title={title} backTo="/me" />
      <Tabs value={tab} onChange={(value) => onTabChange(value === 'farms' ? 'farms' : 'products')}>
        <Tabs.List aria-label="보기">
          <Tabs.Tab value="products">
            관심 상품 <span className="pd-num">{count(products.length)}</span>
          </Tabs.Tab>
          <Tabs.Tab value="farms">
            팔로우한 농가 <span className="pd-num">{count(farms.length)}</span>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {notConnected ? (
        <NotConnected
          title={
            tab === 'products'
              ? '관심 상품은 아직 연결되지 않았어요'
              : '팔로우한 농가는 아직 연결되지 않았어요'
          }
          api="📝 관심 상품·팔로우 농가"
          action={{ label: '상품 둘러보기', to: '/products' }}
        />
      ) : (
        <QueryState
          status={status === 'success' && isEmpty ? 'empty' : status}
          skeleton={<ProductGridSkeleton count={4} />}
          loadingLabel={`${title}을 불러오고 있어요`}
          onRetry={onRetry}
          empty={
            tab === 'products'
              ? {
                  icon: <Heart />,
                  title: '아직 관심 상품이 없어요',
                  description: '상품의 하트를 누르면 이곳에 모여요.',
                  action: { label: '둘러보기', to: '/products' },
                }
              : {
                  icon: <Store />,
                  title: '아직 팔로우한 농가가 없어요',
                  description: '마음에 드는 농가를 팔로우하면 이곳에서 모아 볼 수 있어요.',
                  action: { label: '둘러보기', to: '/' },
                }
          }
        >
          {tab === 'products' ? (
            <ProductGrid>
              {products.map((item) => (
                <ProductCard
                  key={item.product.productId}
                  {...item}
                  liked
                  onToggleLike={onUnlike && (() => onUnlike(item.product.productId))}
                />
              ))}
            </ProductGrid>
          ) : (
            <Stack gap="sm">
              {farms.map(({ seller, productCount }) => (
                <FarmCard
                  key={seller.sellerId}
                  name={seller.storeName}
                  to={`/farms/${seller.sellerId}`}
                  imageUrl={seller.profileImageUrl}
                  region={seller.region}
                  followerCount={seller.followerCount}
                  extraMeta={`판매 중인 상품 ${formatAmount(productCount)}개`}
                  badge={
                    seller.suspended ? (
                      <StatusBadge status={ProductSaleState.SELLER_SUSPENDED} />
                    ) : undefined
                  }
                  action={
                    <Button
                      variant="outline"
                      aria-label={`${seller.storeName} 팔로잉 취소`}
                      onClick={() => onUnfollow?.(seller.sellerId)}
                    >
                      팔로잉 취소
                    </Button>
                  }
                />
              ))}
            </Stack>
          )}
        </QueryState>
      )}
    </div>
  )
}
