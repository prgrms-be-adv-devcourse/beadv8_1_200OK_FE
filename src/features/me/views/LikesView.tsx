import { Alert, Button, Pagination, Stack, Tabs } from '@mantine/core'
import { EyeOff, Heart, Store } from 'lucide-react'
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

// B-14 관심 상품 · 팔로우한 농가 /me/likes?tab=products|farms&page=. 시안: b2c/Likes, LikesMobile
// 상품: ✅ 찜 목록(최근 찜 순) → 상품 카드 여러 개 조회로 카드를 그린다. 일시 품절·판매 종료는 카드 막으로 흐리게,
//   하트를 누르면 관심에서 뺀다. 숨김·삭제된 상품은 카드 조회에서 빠져 안 보이므로 몇 개가 빠졌는지 알린다.
// 농가: 판매 중지 배지, 팔로잉 취소.
// TODO(api): 📝 followings 조회·언팔로우 API 없음. farms를 넘기지 않으면 팔로우 탭은 ‘연결 전’(개수는 ‘–’)을 그린다.

export type LikesTab = 'products' | 'farms'

export type LikesViewProps = {
  /** 관심 상품 탭의 상태 */
  status: 'pending' | 'error' | 'success'
  tab: LikesTab
  onTabChange: (tab: LikesTab) => void
  /** 이 페이지의 관심 상품 카드. liked가 없으면 찜한 것으로 그린다 */
  products?: ProductCardItem[]
  /** 찜 수(totalElements). 숨김·삭제된 상품의 찜도 센다. 모르면 탭에 숫자를 그리지 않는다 */
  totalCount?: number
  /** 이 페이지에서 카드가 빠진 찜 수(숨김·삭제된 상품) */
  hiddenCount?: number
  /** 지금 페이지 (1부터) */
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  errorMessage?: string
  /** TODO(api): 📝 팔로우한 농가. 없으면 팔로우 탭은 ‘연결 전’ */
  farms?: FollowedFarm[]
  /** 하트를 누름 (지금 찜했으면 빼고, 뺀 뒤 아직 목록에 남아 있으면 다시 담는다) */
  onToggleLike?: (productId: number) => void
  onUnfollow?: (sellerId: number) => void
  onRetry?: () => void
}

export function LikesView({
  status,
  tab,
  onTabChange,
  products = [],
  totalCount,
  hiddenCount = 0,
  page = 1,
  totalPages = 0,
  onPageChange,
  errorMessage,
  farms,
  onToggleLike,
  onUnfollow,
  onRetry,
}: LikesViewProps) {
  const title = tab === 'products' ? '관심 상품' : '팔로우한 농가'
  const isEmpty =
    tab === 'products' ? products.length === 0 && hiddenCount === 0 : farms?.length === 0
  const farmsNotConnected = tab === 'farms' && farms === undefined

  return (
    <div className={classes.root}>
      <PageHeader title={title} backTo="/me" />
      <Tabs value={tab} onChange={(value) => onTabChange(value === 'farms' ? 'farms' : 'products')}>
        <Tabs.List aria-label="보기">
          <Tabs.Tab value="products">
            관심 상품{' '}
            {totalCount !== undefined && <span className="pd-num">{formatAmount(totalCount)}</span>}
          </Tabs.Tab>
          <Tabs.Tab value="farms">
            팔로우한 농가{' '}
            <span className="pd-num">
              {farms === undefined ? <NotConnectedValue /> : formatAmount(farms.length)}
            </span>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {farmsNotConnected ? (
        <NotConnected
          title="팔로우한 농가는 아직 연결되지 않았어요"
          api="📝 팔로우 농가"
          action={{ label: '상품 둘러보기', to: '/products' }}
        />
      ) : (
        <QueryState
          status={
            tab === 'farms'
              ? isEmpty
                ? 'empty'
                : 'success'
              : status === 'success' && isEmpty
                ? 'empty'
                : status
          }
          errorMessage={tab === 'products' ? errorMessage : undefined}
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
            <div className={classes.list}>
              {hiddenCount > 0 && (
                <Alert role="note" color="info" icon={<EyeOff />}>
                  판매자가 숨기거나 삭제한 상품 {formatAmount(hiddenCount)}개는 이 페이지에 보이지
                  않아요.
                </Alert>
              )}
              {products.length > 0 && (
                <ProductGrid>
                  {products.map((item) => (
                    <ProductCard
                      key={item.product.productId}
                      {...item}
                      liked={item.liked ?? true}
                      onToggleLike={onToggleLike && (() => onToggleLike(item.product.productId))}
                    />
                  ))}
                </ProductGrid>
              )}
              {totalPages > 1 && onPageChange && (
                <Pagination
                  className={classes.pagination}
                  total={totalPages}
                  value={page}
                  onChange={onPageChange}
                  getControlProps={(control) => ({
                    'aria-label': control === 'next' ? '다음 페이지' : '이전 페이지',
                  })}
                />
              )}
            </div>
          ) : (
            <Stack gap="sm">
              {(farms ?? []).map(({ seller, productCount }) => (
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
