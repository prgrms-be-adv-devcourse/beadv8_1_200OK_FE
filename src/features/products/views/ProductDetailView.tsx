import { ActionIcon, Alert, Box, Button, Drawer, Group, Skeleton, Stack, Text } from '@mantine/core'
import { CircleAlert, Heart, Info, PackageX, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { ProductDetail, ProductReview, SellerProfile } from '@/shared/api/types'
import { formatAmount } from '@/shared/lib/format'
import { categoryLabels } from '@/shared/lib/labels'
import {
  getProductSaleState,
  ProductSaleState,
  productSaleStateLabels,
} from '@/shared/lib/productState'
import {
  CtaBar,
  DisabledReason,
  FarmAvatar,
  FarmCard,
  FollowButton,
  LedgerBlock,
  type LoginReason,
  LoginRequiredModal,
  NOT_CONNECTED_REASON,
  NotConnected,
  OriginTag,
  PageBreadcrumbs,
  PriceText,
  QueryState,
  RatingStars,
  RichContent,
  StatusBadge,
} from '@/shared/ui'
import { ProductGallery } from '../components/ProductGallery'
import { PurchaseForm } from '../components/PurchaseForm'
import { ReviewSection } from '../components/ReviewSection'
import type { CartSelection, ListStatus } from '../types'
import classes from './ProductDetailView.module.css'

// B-02 상품 상세. 시안: b2c/Main(데스크톱), b2c/ProductMobile
// 데스크톱: 사진 | 정보 + 옵션 + 수량 + 담기. 모바일: 하단 CTA 바(관심 + 담기) → 옵션 시트.
// 판매자 정보·수확일은 상세 API에 없어 따로 받는다(A-2). 재고 임박은 표시하지 않는다(A-7).
// 배송비는 상품 API에 없고 정책도 미정이라(A-8, C-1) 주문서에서 안내한다고만 쓴다.
// TODO(api): 📝 GET /sellers/{sellerId}(상세에 sellerId 없음), 📝 관심·팔로우 API.
//   seller가 없으면 생산 정보에 ‘연결 전’ 안내, onToggleLike·onToggleFollow가 없으면 버튼을 막고 이유(NOT_CONNECTED_REASON)를 보인다.

export type DetailStatus = 'pending' | 'error' | 'notFound' | 'success'

export type ProductDetailViewProps = {
  status: DetailStatus
  product?: ProductDetail
  /** TODO(api): 상세 API에 판매자가 없다. 📝 GET /sellers/{sellerId}. 없으면 ‘연결 전’ */
  seller?: SellerProfile
  /** TODO(api): 수확일 필드 없음(A-2) */
  harvestDate?: string
  following?: boolean
  liked?: boolean
  /** 내 상품 (담기 대신 수정). TODO(api): 판단할 판매자 ID가 상세 API에 없다 */
  isOwner?: boolean
  reviews: ProductReview[]
  /** 리뷰 목록 상태 (기본 success). 상품은 불러왔는데 리뷰만 실패할 수 있다 */
  reviewsStatus?: ListStatus
  reviewsErrorMessage?: string
  onRetryReviews?: () => void
  hasMoreReviews?: boolean
  loadingMoreReviews?: boolean
  onLoadMoreReviews?: () => void
  currentMemberId?: number
  /** 처음 골라 둘 옵션 (없으면 품절 아닌 첫 옵션) */
  defaultOptionId?: number
  /** 처음 수량 (기본 1) */
  defaultQuantity?: number
  adding?: boolean
  onAddToCart: (selection: CartSelection) => void
  /** TODO(api): 📝 관심 상품. 없으면 관심 버튼을 막고 이유를 보인다(연결 전) */
  onToggleLike?: () => void
  /** TODO(api): 📝 팔로우. 없으면 팔로우 버튼을 막고 이유를 보인다(연결 전) */
  onToggleFollow?: () => void
  onDeleteReview?: (reviewId: number) => void
  onRetry?: () => void
  errorMessage?: string
  loginPrompt?: LoginReason | null
  onLoginPromptClose?: () => void
}

const blockedReasons: Record<ProductSaleState, string> = {
  [ProductSaleState.SOLD_OUT]: '모든 옵션이 품절이라 지금은 구매할 수 없어요',
  [ProductSaleState.UPCOMING]: '판매 예정 상품이라 아직 담을 수 없어요',
  [ProductSaleState.PAUSED]: '판매가 잠시 중지된 상품이라 지금은 구매할 수 없어요',
  [ProductSaleState.ENDED]: '판매가 종료된 상품이에요',
  [ProductSaleState.SELLER_SUSPENDED]: '판매가 중지된 농가의 상품이라 지금은 구매할 수 없어요',
}

const tabs = [
  { id: 'product-info', label: '상품 정보' },
  { id: 'product-farm', label: '생산 정보' },
  { id: 'product-reviews', label: '리뷰' },
  { id: 'product-shipping', label: '배송·취소 안내' },
] as const

const shippingNotes = [
  '신선식품 특성상 단순 변심으로 인한 반품은 어려워요.',
  '출고(송장 등록) 전까지만 취소를 요청할 수 있고, 판매자 확인 후 예치금으로 돌려드려요.',
  '배송 후 상품에 문제가 있으면 사진과 함께 고객센터로 문의해 주세요.',
  '구매확정 후에는 취소·환불이 안 돼요.',
]

function DetailSkeleton() {
  return (
    <div className={classes.top}>
      <Stack gap="sm">
        <Skeleton className={classes.skeletonImage} />
        <Group gap="xs">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} w={72} h={72} />
          ))}
        </Group>
      </Stack>
      <Stack gap="md">
        <Skeleton h={32} w={180} />
        <Skeleton h={32} w="70%" />
        <Skeleton h={34} w={140} />
        <Skeleton h={156} radius="md" />
        <Skeleton h={56} />
        <Skeleton h={56} />
        <Skeleton h={52} mt="md" />
      </Stack>
    </div>
  )
}

function ShippingSummary() {
  return (
    <div className={classes.shipping}>
      <Truck size={20} aria-hidden="true" />
      <div>
        <p>배송비는 주문서에서 농가별로 안내해요</p>
        <p className={classes.help}>제주·도서산간 지역은 추가 운임이 있을 수 있어요</p>
      </div>
    </div>
  )
}

export function ProductDetailView({
  status,
  product,
  seller,
  harvestDate,
  following = false,
  liked = false,
  isOwner = false,
  reviews,
  reviewsStatus,
  reviewsErrorMessage,
  onRetryReviews,
  hasMoreReviews,
  loadingMoreReviews,
  onLoadMoreReviews,
  currentMemberId,
  defaultOptionId,
  defaultQuantity = 1,
  adding = false,
  onAddToCart,
  onToggleLike,
  onToggleFollow,
  onDeleteReview,
  onRetry,
  errorMessage,
  loginPrompt = null,
  onLoginPromptClose = () => {},
}: ProductDetailViewProps) {
  const firstAvailable = product?.options.find((option) => !option.soldOut)?.optionId ?? null
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(
    defaultOptionId ?? firstAvailable,
  )
  const [quantity, setQuantity] = useState(defaultQuantity)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>(tabs[0].id)

  const resolvedStatus = status === 'success' && !product ? 'notFound' : status

  if (resolvedStatus !== 'success' || !product) {
    return (
      <QueryState
        status={resolvedStatus}
        skeleton={<DetailSkeleton />}
        loadingLabel="상품 정보를 불러오고 있어요"
        errorMessage={errorMessage}
        onRetry={onRetry}
        notFound={{
          icon: <PackageX />,
          title: '상품을 찾을 수 없어요',
          description: '판매가 끝났거나 주소가 바뀌었을 수 있어요.',
          action: { label: '상품 둘러보기', to: '/products' },
        }}
      />
    )
  }

  const saleState = getProductSaleState(product, { sellerSuspended: seller?.suspended })
  const blockedReason = saleState ? blockedReasons[saleState] : null
  const selected = product.options.find((option) => option.optionId === selectedOptionId)
  const shown = selected ?? product.options[0]
  const farmPath = seller ? `/farms/${seller.sellerId}` : undefined

  const selectOption = (optionId: number) => {
    setSelectedOptionId(optionId)
    setQuantity(1)
  }

  const addToCart = () => {
    if (selectedOptionId === null) return
    onAddToCart({ optionId: selectedOptionId, quantity })
    setSheetOpen(false)
  }

  const renderPurchaseForm = (hideOptionLabel = false) => (
    <PurchaseForm
      productName={product.name}
      options={product.options}
      selectedOptionId={selectedOptionId}
      onSelectOption={selectOption}
      quantity={quantity}
      onQuantityChange={setQuantity}
      disabled={blockedReason !== null}
      hideOptionLabel={hideOptionLabel}
    />
  )

  const likeButton = onToggleLike && (
    <ActionIcon
      variant="default"
      size={52}
      className={classes.like}
      data-liked={liked || undefined}
      aria-label="관심 상품"
      aria-pressed={liked}
      onClick={onToggleLike}
    >
      <Heart size={22} aria-hidden="true" />
    </ActionIcon>
  )
  // 관심 API가 없을 때: 버튼은 보이되 막고 이유를 붙인다
  const likeNotConnected = !onToggleLike && !isOwner && (
    <DisabledReason reason={NOT_CONNECTED_REASON}>
      <Button variant="default" leftSection={<Heart size={18} aria-hidden="true" />} disabled>
        관심 상품
      </Button>
    </DisabledReason>
  )
  const followControl = isOwner ? null : onToggleFollow ? (
    <FollowButton following={following} onClick={onToggleFollow} />
  ) : (
    <DisabledReason reason={NOT_CONNECTED_REASON}>
      <Button variant="outline" disabled>
        팔로우
      </Button>
    </DisabledReason>
  )

  return (
    <div className={classes.root}>
      <Box visibleFrom="md">
        <PageBreadcrumbs
          items={[
            { label: '홈', to: '/' },
            {
              label: categoryLabels[product.category],
              to: `/products?category=${product.category}`,
            },
            { label: product.name },
          ]}
        />
      </Box>

      {saleState === ProductSaleState.ENDED && (
        <Alert color="info" icon={<Info />} title="판매가 종료된 상품이에요">
          <Stack gap="sm" align="flex-start">
            같은 농가의 다른 상품은 상점에서 볼 수 있어요.
            {farmPath && (
              <Button component={Link} to={farmPath} variant="outline" size="sm">
                상점 보기
              </Button>
            )}
          </Stack>
        </Alert>
      )}
      {saleState === ProductSaleState.SELLER_SUSPENDED && (
        <Alert color="warning" icon={<CircleAlert />} title="판매가 중지된 농가예요">
          지금은 이 농가의 상품을 주문할 수 없어요.
        </Alert>
      )}

      <div className={classes.top}>
        <ProductGallery
          images={product.imageUrls}
          productName={product.name}
          veilLabel={
            saleState === ProductSaleState.SOLD_OUT ? productSaleStateLabels[saleState] : undefined
          }
        />

        <div className={classes.info}>
          <div className={classes.titleBlock}>
            {seller && (
              <div className={classes.sellerRow}>
                <Link to={`/farms/${seller.sellerId}`} className={classes.sellerLink}>
                  <FarmAvatar name={seller.storeName} imageUrl={seller.profileImageUrl} size={32} />
                  {seller.storeName}
                </Link>
                {followControl}
              </div>
            )}
            <h1 className={classes.name}>{product.name}</h1>
            {product.reviewCount > 0 ? (
              <div className={classes.rating}>
                <RatingStars value={product.averageRating} size={16} />
                <span aria-hidden="true">·</span>
                <a href="#product-reviews" className="pd-num">
                  리뷰 {formatAmount(product.reviewCount)}개
                </a>
              </div>
            ) : (
              <p className={classes.help}>아직 리뷰가 없어요</p>
            )}
            <div className={classes.tags}>
              <OriginTag kind="region" region={product.region} />
              {harvestDate && <OriginTag kind="harvest" date={harvestDate} />}
            </div>
          </div>

          {shown && (
            <div className={classes.price}>
              <PriceText
                amount={shown.salePrice}
                discountRate={shown.discountRate}
                listPrice={shown.listPrice}
                size="L"
                layout="stacked"
              />
              {saleState && <StatusBadge status={saleState} />}
            </div>
          )}

          <LedgerBlock
            title="생산 장부"
            headingLevel="h2"
            producer={seller ? `${seller.storeName}(${seller.representativeName})` : undefined}
            region={product.region}
            date={harvestDate}
          />

          {/* 데스크톱: 옵션 · 수량 · 담기 */}
          <Box visibleFrom="md">
            <Stack gap="lg">
              {renderPurchaseForm()}
              <ShippingSummary />
              {isOwner ? (
                <Stack gap="xs">
                  <Button
                    component={Link}
                    to={`/seller/products/${product.productId}/edit`}
                    variant="outline"
                    size="lg"
                    fullWidth
                  >
                    내 상품이에요 · 상품 수정
                  </Button>
                  <Text className={classes.help} ta="center">
                    내 상품은 장바구니에 담을 수 없어요
                  </Text>
                </Stack>
              ) : (
                <>
                  <div className={classes.actions}>
                    {likeButton}
                    <DisabledReason reason={blockedReason} fullWidth>
                      <Button
                        size="lg"
                        fullWidth
                        disabled={blockedReason !== null}
                        loading={adding}
                        onClick={addToCart}
                      >
                        장바구니 담기
                      </Button>
                    </DisabledReason>
                  </div>
                  {likeNotConnected}
                </>
              )}
            </Stack>
          </Box>

          <Box hiddenFrom="md">
            <Stack gap="md">
              <ShippingSummary />
              {likeNotConnected}
            </Stack>
          </Box>
        </div>
      </div>

      <nav aria-label="상품 상세 메뉴" className={classes.tabs}>
        <div className={classes.tabList}>
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className={classes.tab}
              aria-current={activeTab === tab.id ? 'true' : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.id === 'product-reviews'
                ? `리뷰 ${formatAmount(product.reviewCount)}`
                : tab.label}
            </a>
          ))}
        </div>
      </nav>

      <div className={classes.content}>
        <section id="product-info" aria-labelledby="product-info-title" className={classes.section}>
          <h2 id="product-info-title" className={classes.sectionTitle}>
            상품 정보
          </h2>
          <RichContent html={product.descriptionHtml} />
        </section>

        <section id="product-farm" aria-labelledby="product-farm-title" className={classes.section}>
          <h2 id="product-farm-title" className={classes.sectionTitle}>
            생산 정보
          </h2>
          {seller ? (
            <>
              <FarmCard
                name={seller.storeName}
                to={`/farms/${seller.sellerId}`}
                imageUrl={seller.profileImageUrl}
                region={seller.region}
                followerCount={seller.followerCount}
                description={seller.introduction}
                action={
                  <Button component={Link} to={`/farms/${seller.sellerId}`} variant="outline">
                    상점 보기
                  </Button>
                }
              />
              <dl className={classes.facts}>
                <div>
                  <dt>대표자</dt>
                  <dd>{seller.representativeName}</dd>
                </div>
                {seller.customerServicePhone && (
                  <div>
                    <dt>고객센터</dt>
                    <dd className="pd-num">{seller.customerServicePhone}</dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <Stack gap="sm" align="flex-start">
              <NotConnected
                layout="inline"
                title="판매자 정보는 아직 연결되지 않았어요"
                api="📝 GET /sellers/{sellerId} (상세에 sellerId 없음)"
              />
              {followControl}
            </Stack>
          )}
        </section>

        <section
          id="product-reviews"
          aria-labelledby="product-reviews-title"
          className={classes.section}
        >
          <ReviewSection
            headingId="product-reviews-title"
            averageRating={product.averageRating}
            reviewCount={product.reviewCount}
            reviews={reviews}
            status={reviewsStatus}
            errorMessage={reviewsErrorMessage}
            onRetry={onRetryReviews}
            currentMemberId={currentMemberId}
            hasMore={hasMoreReviews}
            loadingMore={loadingMoreReviews}
            onLoadMore={onLoadMoreReviews}
            onDeleteReview={onDeleteReview}
          />
        </section>

        <section
          id="product-shipping"
          aria-labelledby="product-shipping-title"
          className={classes.section}
        >
          <h2 id="product-shipping-title" className={classes.sectionTitle}>
            배송·취소 안내
          </h2>
          <dl className={classes.facts}>
            <div>
              <dt>배송비</dt>
              <dd>주문서에서 농가별로 안내해요</dd>
            </div>
            <div>
              <dt>추가 운임</dt>
              <dd>제주·도서산간 지역은 추가 운임이 있을 수 있어요</dd>
            </div>
          </dl>
          <ul className={classes.notes}>
            {shippingNotes.map((note) => (
              <li key={note}>
                <Info size={20} aria-hidden="true" className={classes.noteIcon} />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 모바일: 하단 CTA 바 → 옵션 시트 */}
      {isOwner ? (
        <CtaBar
          note="내 상품은 장바구니에 담을 수 없어요"
          action={
            <Button
              component={Link}
              to={`/seller/products/${product.productId}/edit`}
              variant="outline"
              size="lg"
            >
              상품 수정
            </Button>
          }
        />
      ) : (
        <CtaBar
          leading={likeButton}
          reason={blockedReason}
          action={
            <Button size="lg" disabled={blockedReason !== null} onClick={() => setSheetOpen(true)}>
              장바구니 담기
            </Button>
          }
        />
      )}

      <Drawer
        opened={sheetOpen}
        onClose={() => setSheetOpen(false)}
        position="bottom"
        title="옵션 선택"
      >
        <Stack gap="lg">
          {renderPurchaseForm(true)}
          <Button size="lg" fullWidth loading={adding} onClick={addToCart}>
            장바구니 담기
          </Button>
        </Stack>
      </Drawer>

      <LoginRequiredModal reason={loginPrompt} onClose={onLoginPromptClose} />
    </div>
  )
}
