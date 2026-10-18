import { Anchor } from '@mantine/core'
import { ChevronRight, Sprout } from 'lucide-react'
import { Link } from 'react-router'
import {
  FarmCard,
  FollowButton,
  type LoginReason,
  LoginRequiredModal,
  ProductCard,
  type ProductCardItem,
  ProductGrid,
  ProductGridSkeleton,
  QueryState,
} from '@/shared/ui'
import type { FarmItem, ListStatus } from '../types'
import classes from './HomeView.module.css'

// B-01 홈. 시안: b2c/Home, HomeMobile
// 이번 주 상품(GET /products 첫 페이지) + 단골이 많은 농가. 헤더 검색·정렬은 API가 없어 두지 않는다(A-9).

export type HomeViewProps = {
  status: ListStatus
  items: ProductCardItem[]
  /** TODO(api): 인기 농가 API 없음. 빈 배열이면 섹션을 그리지 않는다 */
  farms: FarmItem[]
  onToggleLike: (productId: number) => void
  onToggleFollow: (sellerId: number) => void
  onRetry?: () => void
  errorMessage?: string
  /** 비회원이 누른 동작 (로그인 안내 모달) */
  loginPrompt?: LoginReason | null
  onLoginPromptClose?: () => void
}

export function HomeView({
  status,
  items,
  farms,
  onToggleLike,
  onToggleFollow,
  onRetry,
  errorMessage,
  loginPrompt = null,
  onLoginPromptClose = () => {},
}: HomeViewProps) {
  return (
    <div className={classes.root}>
      <section aria-labelledby="home-fresh" className={classes.section}>
        <div className={classes.heading}>
          <div>
            <h1 id="home-fresh" className={`pd-serif ${classes.title}`}>
              이번 주 산지에서 막 수확했어요
            </h1>
            <p className={classes.lead}>
              누가, 어디서, 언제 키웠는지 확인하고 산지 가격 그대로 사세요.
            </p>
          </div>
          <Anchor component={Link} to="/products" className={classes.more}>
            전체 상품 보기
            <ChevronRight size={16} aria-hidden="true" />
          </Anchor>
        </div>

        <QueryState
          status={status === 'success' && items.length === 0 ? 'empty' : status}
          skeleton={<ProductGridSkeleton />}
          loadingLabel="상품을 불러오고 있어요"
          errorMessage={errorMessage}
          onRetry={onRetry}
          empty={{
            icon: <Sprout />,
            title: '아직 등록된 상품이 없어요',
            description: '농가에서 상품을 등록하면 이곳에 보여요.',
          }}
        >
          <ProductGrid>
            {items.map((item) => (
              <ProductCard
                key={item.product.productId}
                {...item}
                onToggleLike={() => onToggleLike(item.product.productId)}
              />
            ))}
          </ProductGrid>
        </QueryState>
      </section>

      {status !== 'pending' && farms.length > 0 && (
        <section aria-labelledby="home-farms" className={classes.section}>
          <h2 id="home-farms" className={`pd-serif ${classes.title}`}>
            단골이 많은 농가
          </h2>
          <div className={classes.farms}>
            {farms.map(({ seller, following }) => (
              <FarmCard
                key={seller.sellerId}
                name={seller.storeName}
                to={`/farms/${seller.sellerId}`}
                imageUrl={seller.profileImageUrl}
                region={seller.region}
                followerCount={seller.followerCount}
                action={
                  <FollowButton
                    following={following}
                    onClick={() => onToggleFollow(seller.sellerId)}
                  />
                }
              />
            ))}
          </div>
        </section>
      )}

      <LoginRequiredModal reason={loginPrompt} onClose={onLoginPromptClose} />
    </div>
  )
}
