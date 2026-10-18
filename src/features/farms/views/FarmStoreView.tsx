import { Alert, Button, Skeleton, Stack, Text } from '@mantine/core'
import { CircleAlert, Store } from 'lucide-react'
import { Link } from 'react-router'
import type { SellerProfile } from '@/shared/api/types'
import { formatAmount } from '@/shared/lib/format'
import { ProductSaleState } from '@/shared/lib/productState'
import {
  EmptyView,
  FarmAvatar,
  FollowButton,
  type LoginReason,
  LoginRequiredModal,
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

export type FarmStoreViewProps = {
  status: 'pending' | 'error' | 'notFound' | 'success'
  /** TODO(api): 📝 GET /sellers/{sellerId} */
  seller?: SellerProfile
  following?: boolean
  /** 내 상점. TODO(api): 내 판매자 ID를 줄 API가 없다(A-12) */
  isOwner?: boolean
  /** TODO(api): 판매자별 상품 목록 API 없음 */
  products: ProductCardItem[]
  onToggleFollow: () => void
  onToggleLike: (productId: number) => void
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
            팔로워 <strong>{formatAmount(seller.followerCount)}</strong>명
          </span>
          {isOwner ? (
            <>
              <Button component={Link} to="/seller/profile" variant="outline">
                상점 프로필 수정
              </Button>
              <Text className={classes.help}>내 상점은 팔로우할 수 없어요</Text>
            </>
          ) : (
            <FollowButton following={following} onClick={onToggleFollow} />
          )}
        </div>
      </section>

      <section aria-labelledby="farm-products" className={classes.products}>
        <h2 id="farm-products" className={classes.sectionTitle}>
          판매 중인 상품 <span className={`pd-num ${classes.count}`}>{products.length}</span>
        </h2>
        {products.length === 0 ? (
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
                sellerSuspended={seller.suspended}
                onToggleLike={() => onToggleLike(item.product.productId)}
              />
            ))}
          </ProductGrid>
        )}
      </section>

      <LoginRequiredModal reason={loginPrompt} onClose={onLoginPromptClose} />
    </div>
  )
}
