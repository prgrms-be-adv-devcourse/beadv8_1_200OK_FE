import { Button, Checkbox, NativeSelect, Skeleton } from '@mantine/core'
import { PackageOpen, Search, X } from 'lucide-react'
import { Link } from 'react-router'
import { type ProductCategory, ProductRegion } from '@/shared/api/types'
import { regionLabels } from '@/shared/lib/labels'
import {
  type EmptyViewProps,
  type LoginReason,
  LoginRequiredModal,
  PageHeader,
  ProductCard,
  type ProductCardItem,
  ProductGrid,
  ProductGridSkeleton,
  QueryState,
} from '@/shared/ui'
import type { CategoryOption, ListStatus } from '../types'
import classes from './ProductListView.module.css'

// 상품 목록 · 검색. 시안: b2c/Category, CategoryMobile
// 필터는 API가 받는 category·region만(URL searchParams). 정렬은 API가 없어 두지 않는다(A-9).
// 품절 제외는 서버 파라미터가 없어 불러온 목록에서 거른다 — 거르는 일은 컨테이너가 하고 View는 결과만 받는다.

export type ProductListViewProps = {
  status: ListStatus
  /** 불러온 상품 (품절 제외를 켰으면 거른 뒤) */
  items: ProductCardItem[]
  /** 서버가 알려 준 전체 개수 (totalElements) */
  totalCount?: number
  categories: CategoryOption[]
  category?: ProductCategory | null
  region?: ProductRegion | null
  onRegionChange: (region: ProductRegion | null) => void
  /** TODO(api): 검색어 파라미터가 없다(A-9). 검색이 생기면 쓴다 */
  query?: string
  onClearQuery?: () => void
  hideSoldOut: boolean
  onHideSoldOutChange: (hide: boolean) => void
  /** 품절 제외로 숨긴 상품 수 */
  hiddenSoldOutCount?: number
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  onToggleLike: (productId: number) => void
  onRetry?: () => void
  errorMessage?: string
  loginPrompt?: LoginReason | null
  onLoginPromptClose?: () => void
}

const regionOptions = [
  { value: '', label: '전체 산지' },
  ...Object.values(ProductRegion).map((code) => ({ value: code, label: regionLabels[code] })),
]

/** 받침 있는 말 뒤에는 ‘과’, 없으면 ‘와’ */
function withWa(word: string) {
  const code = word.charCodeAt(word.length - 1)
  const hasFinal = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0
  return `${word}${hasFinal ? '과' : '와'}`
}

export function ProductListView({
  status,
  items,
  totalCount,
  categories,
  category,
  region,
  onRegionChange,
  query,
  onClearQuery,
  hideSoldOut,
  onHideSoldOutChange,
  hiddenSoldOutCount = 0,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onToggleLike,
  onRetry,
  errorMessage,
  loginPrompt = null,
  onLoginPromptClose = () => {},
}: ProductListViewProps) {
  const categoryLabel = categories.find((c) => c.code === category)?.label
  const title = query ? `“${query}” 검색 결과` : (categoryLabel ?? '전체 상품')
  const scopeLabel = [region ? regionLabels[region] : null, categoryLabel].filter(Boolean).join(' ')
  const loaded = status === 'success'
  const count = totalCount ?? items.length
  const allSoldOutHidden = loaded && items.length === 0 && hiddenSoldOutCount > 0
  const showTools = status === 'pending' || (loaded && (items.length > 0 || allSoldOutHidden))

  const empty: EmptyViewProps = allSoldOutHidden
    ? {
        title: '지금 살 수 있는 상품이 없어요',
        description: '모든 상품이 일시 품절이에요. 품절 상품도 함께 볼 수 있어요.',
        action: { label: '품절 상품도 보기', onClick: () => onHideSoldOutChange(false) },
      }
    : query
      ? {
          icon: <Search />,
          title: `“${withWa(query)}” 맞는 상품이 없어요`,
          description:
            '검색어의 철자가 맞는지 확인해 주세요. 품목 이름(예: 사과, 고구마)으로 찾아도 돼요.',
          action: { label: '전체 상품 보기', to: '/products' },
        }
      : {
          icon: <PackageOpen />,
          title: `${scopeLabel || '등록된'} 상품이 아직 없어요`,
          description: '농가에서 상품을 등록하면 이곳에 보여요.',
          action: scopeLabel ? { label: '전체 상품 보기', to: '/products' } : undefined,
        }

  return (
    <div className={classes.root}>
      <PageHeader
        title={title}
        backTo="/"
        breadcrumbs={[{ label: '홈', to: '/' }, { label: title }]}
      />

      {/* 모바일 카테고리 (데스크톱은 헤더의 카테고리 탭) */}
      <nav aria-label="카테고리" className={classes.categories}>
        <Button
          component={Link}
          to="/products"
          size="sm"
          radius="xl"
          variant={!category && !query ? 'filled' : 'outline'}
          aria-current={!category && !query ? 'page' : undefined}
        >
          전체
        </Button>
        {categories.map((c) => {
          const active = c.code === category && !query
          return (
            <Button
              key={c.code}
              component={Link}
              to={`/products?category=${c.code}`}
              size="sm"
              radius="xl"
              variant={active ? 'filled' : 'outline'}
              aria-current={active ? 'page' : undefined}
            >
              {c.label}
            </Button>
          )
        })}
      </nav>

      <section aria-label={`${title} 상품`} className={classes.section}>
        <div className={classes.bar}>
          <div className={classes.count}>
            {loaded && (
              <span role="status" className="pd-num">
                상품 {count}개
                {hideSoldOut && hiddenSoldOutCount > 0 && ` · 품절 ${hiddenSoldOutCount}개 제외`}
              </span>
            )}
            {status === 'pending' && <Skeleton h={16} w={72} />}
            {query && onClearQuery && (
              <Button
                variant="subtle"
                size="sm"
                leftSection={<X size={16} aria-hidden="true" />}
                onClick={onClearQuery}
              >
                검색어 지우기
              </Button>
            )}
          </div>
          {showTools && (
            <div className={classes.tools}>
              <Checkbox
                label="품절 상품 제외"
                checked={hideSoldOut}
                onChange={(event) => onHideSoldOutChange(event.currentTarget.checked)}
              />
              <NativeSelect
                aria-label="산지"
                className={classes.region}
                data={regionOptions}
                value={region ?? ''}
                onChange={(event) =>
                  onRegionChange((event.currentTarget.value || null) as ProductRegion | null)
                }
              />
            </div>
          )}
        </div>

        <QueryState
          status={loaded && items.length === 0 ? 'empty' : status}
          skeleton={<ProductGridSkeleton />}
          loadingLabel="상품을 불러오고 있어요"
          errorMessage={errorMessage}
          onRetry={onRetry}
          empty={empty}
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
          {hasMore && onLoadMore && (
            <div className={classes.more}>
              <Button variant="outline" loading={loadingMore} onClick={onLoadMore}>
                상품 더 보기
              </Button>
            </div>
          )}
        </QueryState>
      </section>

      <LoginRequiredModal reason={loginPrompt} onClose={onLoginPromptClose} />
    </div>
  )
}
