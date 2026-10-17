import { Button, SimpleGrid, Skeleton, Stack, TextInput, Title } from '@mantine/core'
import { useParams, useSearchParams } from 'react-router'
import {
  MemberRole,
  ProductCategory,
  ProductRegion,
  ProductStatus,
  type ProductSummary,
} from '@/shared/api/types'
import { PageHeader, ProductCard } from '@/shared/ui'
import { AdminLayoutView } from '../layouts/AdminLayout'
import { AuthLayoutView } from '../layouts/AuthLayout'
import { PublicLayoutView } from '../layouts/PublicLayout'
import { SellerLayoutView } from '../layouts/SellerLayout'
import type { Session } from '../session'

// /__design/preview/:layout?state= — 갤러리가 iframe(1440 · 390)으로 띄우는 레이아웃 미리보기 (개발 전용)

const sessions: Record<string, Session> = {
  guest: { status: 'guest' },
  buyer: { status: 'authenticated', role: MemberRole.BUYER },
  seller: { status: 'authenticated', role: MemberRole.SELLER },
}

const sampleProduct = (id: number, name: string, price: number): ProductSummary => ({
  productId: id,
  name,
  thumbnailUrl: '',
  minSalePrice: price,
  minPriceListPrice: price,
  discountRate: 0,
  category: ProductCategory.FRUIT,
  region: ProductRegion.GYEONGBUK,
  status: ProductStatus.ON_SALE,
  soldOut: false,
  reviewCount: 12,
  averageRating: 4.6,
})

function HomeContent() {
  return (
    <Stack gap="lg">
      <Title order={1} className="pd-serif" fz={{ base: '1.625rem', md: '2rem' }}>
        이번 주 산지에서 막 수확했어요
      </Title>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing={{ base: 12, sm: 20, md: 24 }}>
        {['청송 꿀사과', '해남 꿀고구마', '제주 감귤', '평창 알배기배추'].map((name, i) => (
          <ProductCard
            key={name}
            product={sampleProduct(i + 1, name, 13900 + i * 2000)}
            to="/__design/preview/public"
          />
        ))}
      </SimpleGrid>
    </Stack>
  )
}

function SubPageContent() {
  return (
    <>
      <PageHeader title="주문 내역" backTo="/__design/preview/public" />
      <Stack gap="sm">
        <Skeleton h={160} />
        <Skeleton h={120} />
        <Skeleton h={120} />
      </Stack>
    </>
  )
}

function ConsoleContent({ area, title, action }: { area: string; title: string; action?: string }) {
  return (
    <>
      <PageHeader
        title={title}
        hideOnMobile
        breadcrumbs={[{ label: area, to: '/__design' }, { label: title }]}
        actions={action && <Button>{action}</Button>}
      />
      <Stack gap="sm" mt="lg">
        <Skeleton h={44} />
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} h={52} />
        ))}
      </Stack>
    </>
  )
}

export function LayoutPreview() {
  const { layout } = useParams()
  const [params] = useSearchParams()
  const state = params.get('state') ?? 'guest'

  switch (layout) {
    case 'public':
      return (
        <PublicLayoutView
          session={sessions[state] ?? { status: 'guest' }}
          cartCount={state === 'guest' ? undefined : 2}
          showMobileHeader
          showTabBar
          currentPath="/"
        >
          <HomeContent />
        </PublicLayoutView>
      )
    case 'public-sub':
      return (
        <PublicLayoutView session={{ status: 'guest' }} showTabBar currentPath="/orders">
          <SubPageContent />
        </PublicLayoutView>
      )
    case 'auth':
      return (
        <AuthLayoutView>
          <PageHeader title="로그인" backTo="/__design/preview/public" />
          <Stack gap="md" pt={{ base: 'xl', md: 'md' }}>
            <TextInput label="아이디" />
            <TextInput label="비밀번호" type="password" />
            <Button size="lg">로그인</Button>
          </Stack>
        </AuthLayoutView>
      )
    case 'seller':
      return (
        <SellerLayoutView
          title="상품 관리"
          storeName="청송 햇살농원"
          userName="김영수"
          pendingOrders={5}
          pendingClaims={2}
          currentPath="/seller/products"
        >
          <ConsoleContent area="판매자 센터" title="상품 관리" action="상품 등록" />
        </SellerLayoutView>
      )
    case 'admin':
      return (
        <AdminLayoutView
          title="판매자 심사"
          adminName="운영팀 정민호"
          pendingSellers={3}
          currentPath="/admin/sellers"
        >
          <ConsoleContent area="관리자 콘솔" title="판매자 심사" />
        </AdminLayoutView>
      )
    default:
      return <p>알 수 없는 레이아웃: {layout}</p>
  }
}
