import { Button, Group, Radio, SimpleGrid, Stack } from '@mantine/core'
import { Heart, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import {
  OrderItemStatus,
  ProductCategory,
  type ProductOption,
  ProductRegion,
  ProductStatus,
  type ProductSummary,
} from '@/shared/api/types'
import { ClaimState } from '@/shared/lib/claimState'
import { ProductSaleState } from '@/shared/lib/productState'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { ShipmentState } from '@/shared/lib/shipmentState'
import { WithdrawalState } from '@/shared/lib/withdrawalState'
import {
  CtaBar,
  DisabledReason,
  EmptyView,
  FarmAvatar,
  FarmCard,
  FollowButton,
  LedgerBlock,
  type LoginReason,
  LoginRequiredModal,
  OptionCard,
  OriginTag,
  PageHeader,
  type PhotoItem,
  PhotoUploader,
  PriceText,
  ProductCard,
  ProductGrid,
  ProductGridSkeleton,
  ProductStatusBadge,
  QuantityStepper,
  QueryState,
  RatingStars,
  StatusBadge,
} from '@/shared/ui'
import classes from '../DesignGallery.module.css'
import { GallerySection, Panel, StateGrid, StateItem } from '../GalleryParts'
import preview from '../preview.module.css'

// 0-3 shared/ui 직접 만든 부품. 샘플 값은 갤러리 전용이다(화면 fixtures와 무관).

// ─── 가격 · 배지 · 꼬리표 · 별점 ───────────────────────────

export function PriceSection() {
  return (
    <GallerySection
      id="price"
      title="PriceText"
      meta="금액 + 0.85배 ‘원’, tabular-nums · 할인: 할인율(accent) → 판매가 → 취소선 정가 · 차감 −(기본색)"
    >
      <Panel>
        <StateGrid>
          <StateItem label="기본 · L">
            <PriceText amount={45800} size="L" />
          </StateItem>
          <StateItem label="기본 · M">
            <PriceText amount={23900} />
          </StateItem>
          <StateItem label="기본 · S">
            <PriceText amount={12900} size="S" />
          </StateItem>
          <StateItem label="할인 (카드)">
            <PriceText amount={23900} discountRate={11} />
          </StateItem>
          <StateItem label="할인 + 정가 (한 줄)">
            <PriceText amount={23900} discountRate={11} listPrice={27000} size="S" />
          </StateItem>
          <StateItem label="할인 (상세 · stacked L)">
            <PriceText
              amount={23900}
              discountRate={11}
              listPrice={27000}
              size="L"
              layout="stacked"
            />
          </StateItem>
          <StateItem label="차감">
            <PriceText amount={717} deduct size="S" />
          </StateItem>
          <StateItem label="0원">
            <PriceText amount={0} size="S" />
          </StateItem>
        </StateGrid>
      </Panel>
    </GallerySection>
  )
}

const orderStatuses = Object.values(OrderItemStatus)
const productStates = Object.values(ProductSaleState)

export function BadgeTagSection() {
  return (
    <GallerySection
      id="status-badge"
      title="StatusBadge · OriginTag"
      meta="상태값 → 색·아이콘·문구 매핑은 StatusBadge 한 곳 · 꼬리표는 볏짚 + 흙갈색"
    >
      <Panel title="주문 상품 상태 8종">
        <div className={classes.chipRow}>
          {orderStatuses.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Panel>
      <Panel title="상품 판매 상태 (구매자) + 판매 중지">
        <div className={classes.chipRow}>
          {productStates.map((state) => (
            <StatusBadge key={state} status={state} />
          ))}
        </div>
      </Panel>
      <Panel title="배송 표시 상태 (주문 상품 상태에 없는 것)">
        <div className={classes.chipRow}>
          {Object.values(ShipmentState).map((state) => (
            <StatusBadge key={state} status={state} />
          ))}
        </div>
      </Panel>
      <Panel title="판매자 신청·심사 상태">
        <div className={classes.chipRow}>
          {Object.values(SellerApplicationStatus).map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Panel>
      <Panel title="판매자 상품 판매 상태 (ProductStatusBadge) · 취소 요청 처리 · 출금">
        <div className={classes.chipRow}>
          {Object.values(ProductStatus).map((status) => (
            <ProductStatusBadge key={status} status={status} />
          ))}
          {Object.values(ClaimState).map((state) => (
            <StatusBadge key={state} status={state} />
          ))}
          {Object.values(WithdrawalState).map((state) => (
            <StatusBadge key={state} status={state} />
          ))}
        </div>
      </Panel>
      <Panel title="산지 꼬리표 3종">
        <div className={classes.chipRow}>
          <OriginTag kind="harvest" date="2026-10-08T00:00:00" />
          <OriginTag kind="region" region={ProductRegion.GYEONGBUK} detail="청송" />
          <OriginTag kind="shipping" date="2026-10-12T00:00:00" />
        </div>
      </Panel>
    </GallerySection>
  )
}

export function RatingSection() {
  return (
    <GallerySection
      id="rating-stars"
      title="RatingStars"
      meta="5점 만점 · 별 그림은 0.5 단위 반올림(4.8 → 5개) · 보이는 별·숫자는 aria-hidden, 숨긴 문장 함께"
    >
      <Panel>
        <StateGrid>
          {[5, 4.5, 4.8, 0].map((value) => (
            <StateItem key={value} label={`${value.toFixed(1)}`}>
              <RatingStars value={value} />
            </StateItem>
          ))}
          <StateItem label="카드 (compact 14)">
            <RatingStars value={4.8} reviewCount={128} variant="compact" />
          </StateItem>
          <StateItem label="상세 상단 16">
            <RatingStars value={4.5} size={16} />
          </StateItem>
          <StateItem label="리뷰 요약 20">
            <RatingStars value={4.5} size={20} withValue={false} reviewCount={31} />
          </StateItem>
        </StateGrid>
      </Panel>
    </GallerySection>
  )
}

// ─── 생산 장부 · 상품 카드 · 옵션 · 수량 ────────────────────

export function LedgerSection() {
  return (
    <GallerySection
      id="ledger"
      title="LedgerBlock"
      meta="생산 장부: surface-subtle · radius 12 · 패딩 20 · 점선 행. 지금 API에는 시·도만 있어요(A-2)"
    >
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <StateItem label="농산물">
          <LedgerBlock
            producer="청송 햇살농원(김영수)"
            region={ProductRegion.GYEONGBUK}
            regionDetail="청송군 부남면"
            date="2026-10-08T00:00:00"
          />
        </StateItem>
        <StateItem label="식물 (출하일, 제목 없음)">
          <LedgerBlock
            title={null}
            producer="고양 초록온실"
            region={ProductRegion.GYEONGGI}
            regionDetail="고양시 일산동구"
            date="2026-10-12T00:00:00"
            dateKind="shipping"
          />
        </StateItem>
        <StateItem label="값 없음 (지금 API: 시·도만)">
          <LedgerBlock region={ProductRegion.JEJU} />
        </StateItem>
      </SimpleGrid>
    </GallerySection>
  )
}

const baseProduct: ProductSummary = {
  productId: 1,
  name: '청송 꿀사과 부사',
  thumbnailUrl: '',
  minSalePrice: 23900,
  minPriceListPrice: 23900,
  discountRate: 0,
  category: ProductCategory.FRUIT,
  region: ProductRegion.GYEONGBUK,
  status: ProductStatus.ON_SALE,
  soldOut: false,
  reviewCount: 0,
  averageRating: 0,
}

const cards: { label: string; product: ProductSummary; liked?: boolean }[] = [
  { label: '기본 (리뷰 0 · 평점 줄 숨김)', product: baseProduct },
  {
    label: '할인 · 평점 있음',
    product: {
      ...baseProduct,
      productId: 2,
      name: '해남 꿀고구마 베니하루카 5kg 한 상자 산지 직송',
      minSalePrice: 15900,
      minPriceListPrice: 17900,
      discountRate: 11,
      region: ProductRegion.JEONNAM,
      reviewCount: 86,
      averageRating: 4.6,
    },
  },
  {
    label: '관심',
    liked: true,
    product: {
      ...baseProduct,
      productId: 3,
      name: '제주 노지 조생 감귤',
      minSalePrice: 13900,
      region: ProductRegion.JEJU,
      reviewCount: 54,
      averageRating: 4.7,
    },
  },
  {
    label: '일시 품절',
    product: {
      ...baseProduct,
      productId: 4,
      name: '평창 고랭지 알배기배추',
      minSalePrice: 9900,
      region: ProductRegion.GANGWON,
      soldOut: true,
      reviewCount: 31,
      averageRating: 4.5,
    },
  },
  {
    label: '판매 종료',
    product: {
      ...baseProduct,
      productId: 5,
      name: '영암 무화과',
      minSalePrice: 18900,
      region: ProductRegion.JEONNAM,
      status: ProductStatus.ENDED,
    },
  },
]

export function ProductCardSection() {
  const [liked, setLiked] = useState<Record<number, boolean>>({ 3: true })

  return (
    <GallerySection
      id="product-card"
      title="ProductCard"
      meta="이미지 1:1 → 산지 라인 → 상품명 2줄 → 가격 → 평점(리뷰 0이면 숨김) → 꼬리표 + 옵션 수 · 하트 44 · hover 확대·밑줄"
    >
      <Panel>
        <div className={classes.cardGrid}>
          {cards.map(({ label, product }) => (
            <StateItem key={product.productId} label={label}>
              <ProductCard
                product={product}
                sellerName="햇살농원"
                optionCount={product.productId === 1 ? 3 : 2}
                harvestDate="2026-10-08T00:00:00"
                liked={liked[product.productId] ?? false}
                onToggleLike={() =>
                  setLiked((prev) => ({ ...prev, [product.productId]: !prev[product.productId] }))
                }
                to="/__design#product-card"
              />
            </StateItem>
          ))}
        </div>
      </Panel>
    </GallerySection>
  )
}

const options: ProductOption[] = [
  {
    optionId: 11,
    name: '1kg (5~6과)',
    listPrice: 12900,
    salePrice: 12900,
    discountRate: 0,
    soldOut: false,
  },
  {
    optionId: 12,
    name: '2kg (11~13과)',
    listPrice: 23900,
    salePrice: 23900,
    discountRate: 0,
    soldOut: false,
  },
  { optionId: 13, name: '4입', listPrice: 17900, salePrice: 17900, discountRate: 0, soldOut: true },
]

export function OptionQuantitySection() {
  const [option, setOption] = useState('12')
  const [quantity, setQuantity] = useState(3)

  return (
    <GallerySection
      id="option-card"
      title="OptionCard · QuantityStepper"
      meta="옵션 카드 56 · 이름 왼쪽 가격 오른쪽 · 재고 수량은 API에 없어 ‘N개 남았어요’ 없음(A-7) · 스테퍼 36, 한도 버튼 비활성 + 도움말"
    >
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Panel title="옵션 카드 (default · hover · selected · 품절)">
          <Radio.Group value={option} onChange={setOption} aria-label="옵션">
            <Stack gap="xs">
              <OptionCard option={options[0] as ProductOption} />
              <div className={preview.optionHover}>
                <OptionCard
                  option={{
                    ...(options[0] as ProductOption),
                    optionId: 14,
                    name: '1kg (5~6과) · hover',
                  }}
                />
              </div>
              <OptionCard option={options[1] as ProductOption} />
              <OptionCard option={options[2] as ProductOption} />
            </Stack>
          </Radio.Group>
        </Panel>
        <Panel title="수량 (최소 · 기본 · 최대)">
          <StateGrid>
            <StateItem label="최소 (1)">
              <QuantityStepper value={1} onChange={() => {}} max={10} />
            </StateItem>
            <StateItem label="기본 (눌러 보기)">
              <QuantityStepper value={quantity} onChange={setQuantity} max={10} />
            </StateItem>
            <StateItem label="최대 (재고)">
              <QuantityStepper value={10} onChange={() => {}} max={10} />
            </StateItem>
          </StateGrid>
        </Panel>
      </SimpleGrid>
    </GallerySection>
  )
}

// ─── 상태 화면 · 페이지 머리 · 비활성 이유 · CTA 바 ─────────

export function StateViewSection() {
  return (
    <GallerySection
      id="query-state"
      title="QueryState · EmptyView"
      meta="빈 · 로딩(스켈레톤) · 오류(다시 시도) · 권한 제한 · 404 — CTA는 1개만"
    >
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Panel title="빈 상태">
          <QueryState
            status="empty"
            empty={{
              icon: <ShoppingCart />,
              title: '장바구니가 비어 있어요',
              description: '산지에서 막 수확한 상품을 둘러보세요.',
              action: { label: '홈으로', to: '/__design#query-state' },
            }}
          />
        </Panel>
        <Panel title="로딩">
          <QueryState status="pending" />
        </Panel>
        <Panel title="오류">
          <QueryState status="error" onRetry={() => {}} />
        </Panel>
        <Panel title="권한 제한 (판매자 승인 전)">
          <QueryState
            status="forbidden"
            forbidden={{
              title: '판매자 승인 후 이용할 수 있어요',
              action: { label: '신청 현황 보기', to: '/__design#query-state' },
            }}
          />
        </Panel>
      </SimpleGrid>
      <Panel title="404">
        <QueryState
          status="notFound"
          notFound={{
            title: '찾으시는 상품이 없어요',
            action: { label: '홈으로', to: '/__design#query-state' },
          }}
        />
      </Panel>
      <Panel title="EmptyView 단독 (QueryState 없이)">
        <EmptyView icon={<Heart />} title="아직 관심 상품이 없어요" />
      </Panel>
    </GallerySection>
  )
}

export function PageHeaderSection() {
  return (
    <GallerySection
      id="page-header"
      title="PageHeader"
      meta="데스크톱: 경로 + H1 28/38 + 보조 액션 · 모바일: 56 바 + 뒤로 + 17/24 (실제로는 화면 너비로 자동)"
    >
      <Panel title="데스크톱">
        <PageHeader
          layout="desktop"
          title="상품 등록"
          breadcrumbs={[
            { label: '상품 관리', to: '/__design#page-header' },
            { label: '상품 등록' },
          ]}
          actions={<Button variant="outline">임시 저장</Button>}
        />
      </Panel>
      <Panel title="모바일 (뒤로)">
        <div className={classes.phoneFrame}>
          <PageHeader layout="mobile" title="주문 내역" backTo="/__design#page-header" />
        </div>
      </Panel>
    </GallerySection>
  )
}

export function DisabledCtaSection() {
  return (
    <GallerySection
      id="disabled-reason"
      title="DisabledReason · CtaBar"
      meta="비활성 버튼 아래 이유 문구(버튼 설명으로 연결) · CTA 바: 모바일 하단 고정 72, 금액 요약 + 주 버튼(최소 150)"
    >
      <Panel title="비활성 이유">
        <StateGrid>
          <StateItem label="이유 있음">
            <DisabledReason reason="예치금이 부족해 결제할 수 없어요">
              <Button disabled>45,800원 결제하기</Button>
            </DisabledReason>
          </StateItem>
          <StateItem label="이유 없음 (활성)">
            <DisabledReason reason={null}>
              <Button>45,800원 결제하기</Button>
            </DisabledReason>
          </StateItem>
        </StateGrid>
      </Panel>
      <Panel title="CTA 바 (갤러리에서는 고정 대신 제자리)">
        <Stack gap="md" className={classes.phoneFrame}>
          <CtaBar
            position="static"
            summary={
              <>
                총 <PriceText amount={45800} size="M" />
              </>
            }
            note="결제 후 잔액 6,200원"
            action={<Button size="lg">결제하기</Button>}
          />
          <CtaBar
            position="static"
            summary={
              <>
                총 <PriceText amount={45800} size="M" />
              </>
            }
            reason="예치금이 부족해요"
            action={
              <Button size="lg" disabled>
                결제하기
              </Button>
            }
          />
        </Stack>
      </Panel>
    </GallerySection>
  )
}

// ─── 사진 올리기 ──────────────────────────────────────────

const photo = (id: string, progress?: number): PhotoItem => ({ id, url: '', progress })

export function PhotoUploaderSection() {
  const [items, setItems] = useState<PhotoItem[]>([photo('a'), photo('b'), photo('c')])

  const move = (id: string, direction: -1 | 1) =>
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id)
      const next = [...prev]
      const [item] = next.splice(index, 1)
      if (item) next.splice(index + direction, 0, item)
      return next
    })

  return (
    <GallerySection
      id="photo-uploader"
      title="PhotoUploader"
      meta="최대 N장 · 장당 10MB · 진행률 · 순서 바꾸기(앞·뒤 버튼) · 오류. 업로드는 밖에서 하고 progress로 넘겨요"
    >
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Panel title="빈 (리뷰형)">
          <PhotoUploader label="사진" items={[]} max={3} onAdd={() => {}} onRemove={() => {}} />
        </Panel>
        <Panel title="올리는 중">
          <PhotoUploader
            label="사진"
            items={[photo('1'), photo('2', 45)]}
            max={3}
            onAdd={() => {}}
            onRemove={() => {}}
          />
        </Panel>
        <Panel title="가득 (3/3)">
          <PhotoUploader
            label="사진"
            items={[photo('1'), photo('2'), photo('3')]}
            max={3}
            onAdd={() => {}}
            onRemove={() => {}}
          />
        </Panel>
        <Panel title="10MB 초과">
          <PhotoUploader
            label="사진"
            items={[photo('1')]}
            max={3}
            onAdd={() => {}}
            onRemove={() => {}}
            error="사진은 10MB 이하로 올려 주세요"
          />
        </Panel>
      </SimpleGrid>
      <Panel title="상품 사진형 (대표 · 앞·뒤 버튼으로 순서 바꾸기)">
        <PhotoUploader
          label="상품 사진"
          items={items}
          max={8}
          onAdd={(files) =>
            setItems((prev) => [
              ...prev,
              ...files.map((file) => ({
                id: `${file.name}-${file.lastModified}`,
                url: URL.createObjectURL(file),
              })),
            ])
          }
          onRemove={(id) => setItems((prev) => prev.filter((item) => item.id !== id))}
          onMove={move}
        />
      </Panel>
    </GallerySection>
  )
}

// ─── 농가 · 상품 격자 · 로그인 안내 (1단계 1-1에서 추가) ──────

export function FarmSection() {
  const [following, setFollowing] = useState(false)
  const [loginReason, setLoginReason] = useState<LoginReason | null>(null)

  return (
    <GallerySection
      id="farm"
      title="농가 · 상품 격자 · 로그인 안내"
      meta="FarmAvatar 32·56·96(사진 없으면 첫 글자) · FollowButton 팔로우/팔로잉 · FarmCard · ProductGrid(모바일 2열, 240 자동 채움) · LoginRequiredModal"
    >
      <Panel title="FarmAvatar · FollowButton">
        <StateGrid>
          <StateItem label="32 · 상세 상단">
            <FarmAvatar name="청송 햇살농원" size={32} />
          </StateItem>
          <StateItem label="56 · 농가 카드">
            <FarmAvatar name="땅끝고구마농장" size={56} />
          </StateItem>
          <StateItem label="96 · 상점 머리">
            <FarmAvatar name="서귀포 귤빛농장" size={96} />
          </StateItem>
          <StateItem label="팔로우 (누르면 바뀜)">
            <FollowButton following={following} onClick={() => setFollowing((v) => !v)} />
          </StateItem>
          <StateItem label="팔로잉">
            <FollowButton following onClick={() => {}} />
          </StateItem>
          <StateItem label="처리 중">
            <FollowButton following={false} loading onClick={() => {}} />
          </StateItem>
        </StateGrid>
      </Panel>
      <Panel title="FarmCard">
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <FarmCard
            name="청송 햇살농원"
            to="/__design#farm"
            region={ProductRegion.GYEONGBUK}
            followerCount={1284}
            action={<FollowButton following={false} onClick={() => {}} />}
          />
          <FarmCard
            name="청송 햇살농원"
            to="/__design#farm"
            region={ProductRegion.GYEONGBUK}
            followerCount={1284}
            description="3대째 사과만 키우는 청송 부남면 과수원이에요."
            action={<Button variant="outline">상점 보기</Button>}
          />
        </SimpleGrid>
      </Panel>
      <Panel title="ProductGrid · 로딩 스켈레톤">
        <ProductGrid>
          {cards.slice(0, 2).map(({ product }) => (
            <ProductCard key={product.productId} product={product} to="/__design#farm" />
          ))}
        </ProductGrid>
        <Stack mt="lg">
          <ProductGridSkeleton count={4} />
        </Stack>
      </Panel>
      <Panel title="LoginRequiredModal">
        <Group gap="xs">
          <Button variant="outline" onClick={() => setLoginReason('cart')}>
            담기
          </Button>
          <Button variant="outline" onClick={() => setLoginReason('like')}>
            관심
          </Button>
          <Button variant="outline" onClick={() => setLoginReason('follow')}>
            팔로우
          </Button>
        </Group>
        <LoginRequiredModal reason={loginReason} onClose={() => setLoginReason(null)} />
      </Panel>
    </GallerySection>
  )
}
