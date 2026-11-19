import { Alert, Button, Skeleton, Stack, Text } from '@mantine/core'
import { CircleAlert, Store } from 'lucide-react'
import { Link } from 'react-router'
import type { SellerProfile, StoreProfile } from '@/shared/api/types'
import { formatAmount } from '@/shared/lib/format'
import { ProductSaleState } from '@/shared/lib/productState'
import {
  DisabledReason,
  EmptyView,
  FarmAvatar,
  FollowButton,
  type LoginReason,
  LoginRequiredModal,
  NOT_CONNECTED_REASON,
  NotConnected,
  NotConnectedValue,
  OriginTag,
  ProductCard,
  type ProductCardItem,
  ProductGrid,
  ProductGridSkeleton,
  QueryState,
  StatusBadge,
} from '@/shared/ui'
import classes from './FarmStoreView.module.css'

// B-11 판매자 상점. 시안: b2c/Store, StoreMobile
// 상점 머리(사진 96 · 상호 명조 · 지역 · 소개 · 대표자 · 고객센터 · 팔로워) + 판매 중인 상품.
// 정지된 판매자는 경고 + 배지, 내 상점은 팔로우 대신 프로필 수정(C-9).
// ✅ 상점 프로필 GET /stores/{sellerId}. 사진이 없으면 상호 첫 글자, 소개가 없으면 소개 줄을 뺀다.
// 응답에 없는 지역·팔로워 수·판매 중지는 넘기지 않으면 지역은 빼고 팔로워 수는 ‘–’(연결 전)로 둔다.

/** 서버 응답(StoreProfile) + 아직 API가 없는 값. TODO(api): ❌ 지역·팔로워 수·판매 중지 여부 */
export type FarmStore = StoreProfile &
  Partial<Pick<SellerProfile, 'region' | 'followerCount' | 'suspended'>>

export type FarmStoreViewProps = {
  status: 'pending' | 'error' | 'notFound' | 'success'
  seller?: FarmStore
  following?: boolean
  /** 내 상점(로그인한 판매자의 회원 번호 = sellerId) */
  isOwner?: boolean
  /** 없으면 ‘연결 전’. TODO(api): ❌ 판매자별 상품 목록 API 없음(GET /products에 sellerId 없음) */
  products?: ProductCardItem[]
  onToggleFollow?: () => void
  onToggleLike?: (productId: number) => void
  onRetry?: () => void
  errorMessage?: string
  loginPrompt?: LoginReason | null
  onLoginPromptClose?: () => void
}

function StoreSkeleton() {
  return (
    <Stack gap="xl">
      <div className={classes.header}>
        <Skeleton circle h={96} />
        <Stack gap="sm" className={classes.headerBody}>
          <Skeleton h={42} w="40%" />
          <Skeleton h={24} w={80} />
          <Skeleton h={28} w="80%" />
        </Stack>
      </div>
      <ProductGridSkeleton count={4} />
    </Stack>
  )
}

export function FarmStoreView({
  status,
  seller,
  following = false,
  isOwner = false,
  products,
  onToggleFollow,
  onToggleLike,
  onRetry,
  errorMessage,
  loginPrompt = null,
  onLoginPromptClose = () => {},
}: FarmStoreViewProps) {
  const resolvedStatus = status === 'success' && !seller ? 'notFound' : status

  if (resolvedStatus !== 'success' || !seller) {
    return (
      <QueryState
        status={resolvedStatus}
        skeleton={<StoreSkeleton />}
        loadingLabel="상점 정보를 불러오고 있어요"
        errorMessage={errorMessage}
        onRetry={onRetry}
        notFound={{
          icon: <Store />,
          title: '상점을 찾을 수 없어요',
          description: '문을 닫았거나 주소가 바뀌었을 수 있어요.',
          action: { label: '홈으로', to: '/' },
        }}
      />
    )
  }

  return (
    <div className={classes.root}>
      {seller.suspended && (
        <Alert color="warning" icon={<CircleAlert />} title="현재 판매가 중지된 판매자예요">
          지금은 이 농가의 상품을 주문할 수 없어요.
        </Alert>
      )}

      <section aria-labelledby="farm-name" className={classes.header}>
        <FarmAvatar name={seller.storeName} imageUrl={seller.profileImageUrl} size={96} />
        <div className={classes.headerBody}>
          <div className={classes.nameRow}>
            <h1 id="farm-name" className={`pd-serif ${classes.name}`}>
              {seller.storeName}
            </h1>
            {seller.suspended && <StatusBadge status={ProductSaleState.SELLER_SUSPENDED} />}
          </div>
          {seller.region && (
            <div>
              <OriginTag kind="region" region={seller.region} />
            </div>
          )}
          {seller.introduction && <p className={classes.intro}>{seller.introduction}</p>}
          <dl className={classes.facts}>
            <dt>대표자</dt>
            <dd>{seller.representativeName}</dd>
            {seller.customerServicePhone && (
              <>
                <dt>고객센터</dt>
                <dd className="pd-num">{seller.customerServicePhone}</dd>
              </>
            )}
          </dl>
        </div>
        <div className={classes.side}>
          <span className={`pd-num ${classes.followers}`}>
            팔로워{' '}
            <strong>
              {seller.followerCount === undefined ? (
                <NotConnectedValue />
              ) : (
                formatAmount(seller.followerCount)
              )}
            </strong>
            명
          </span>
          {isOwner ? (
            <>
              <Button component={Link} to="/seller/profile" variant="outline">
                상점 프로필 수정
              </Button>
              <Text className={classes.help}>내 상점은 팔로우할 수 없어요</Text>
            </>
          ) : onToggleFollow ? (
            <FollowButton following={following} onClick={onToggleFollow} />
          ) : (
            <DisabledReason reason={NOT_CONNECTED_REASON}>
              <Button variant="outline" disabled>
                팔로우
              </Button>
            </DisabledReason>
          )}
        </div>
      </section>

      <section aria-labelledby="farm-products" className={classes.products}>
        <h2 id="farm-products" className={classes.sectionTitle}>
          판매 중인 상품{' '}
          {products && <span className={`pd-num ${classes.count}`}>{products.length}</span>}
        </h2>
        {!products ? (
          <NotConnected
            title="판매 중인 상품은 아직 연결되지 않았어요"
            description="농가의 상품은 상품 목록에서 찾아볼 수 있어요."
            api="❌ 판매자별 상품 목록(GET /products에 sellerId 없음)"
            action={{ label: '상품 둘러보기', to: '/products' }}
          />
        ) : products.length === 0 ? (
          <EmptyView
            icon={<Store />}
            title="아직 판매 중인 상품이 없어요"
            description={
              isOwner ? '상품을 등록하면 이곳에 보여요.' : '농가에서 상품을 등록하면 이곳에 보여요.'
            }
            action={isOwner ? { label: '상품 등록하기', to: '/seller/products/new' } : undefined}
          />
        ) : (
          <ProductGrid>
            {products.map((item) => (
              <ProductCard
                key={item.product.productId}
                {...item}
                sellerSuspended={seller.suspended ?? false}
                onToggleLike={onToggleLike && (() => onToggleLike(item.product.productId))}
              />
            ))}
          </ProductGrid>
        )}
      </section>

      <LoginRequiredModal reason={loginPrompt} onClose={onLoginPromptClose} />
    </div>
  )
}
