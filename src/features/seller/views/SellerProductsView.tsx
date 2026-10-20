import {
  Badge,
  Button,
  Pagination,
  Skeleton,
  Stack,
  Switch,
  Table,
  Tabs,
  VisuallyHidden,
} from '@mantine/core'
import { Image as ImageIcon, PackagePlus, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { ProductStatus, ProductVisibility } from '@/shared/api/types'
import { LOW_STOCK_THRESHOLD } from '@/shared/lib/constants'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { productStatusLabels } from '@/shared/lib/labels'
import { DisabledReason, PageHeader, PriceText, ProductStatusBadge, QueryState } from '@/shared/ui'
import type { SellerProductRow } from '../types'
import classes from './SellerProductsView.module.css'

// S-04 상품 관리 /seller/products?status=. 시안: seller/SellerProducts, SellerProductsMobile
// 판매 상태 탭 5개(전체 · 판매 준비 · 판매 중 · 일시 중지 · 판매 종료) + 노출 여부. 데스크톱 표, 모바일 목록.
// 관리 칸: 판매 상태 버튼(READY→판매 시작, ON_SALE→판매 중지, PAUSED→판매 재개) · 노출 스위치 · 수정.
// ✅ GET /sellers/me/products, PATCH /products/{id}/status · /visibility.
// TODO(api): 판매자 상품 상세 API가 없어 수정은 productCache에 있는 상품만(editable). 나머지는 이유를 보여 주고 막는다.

export type ProductTab = ProductStatus | 'ALL'

export type SellerProductsViewProps = {
  status: 'pending' | 'error' | 'success'
  products: SellerProductRow[]
  tab: ProductTab
  onTabChange: (tab: ProductTab) => void
  /** 탭별 개수. 모르는 탭은 숫자를 그리지 않는다(목록 API는 지금 탭 개수만 준다) */
  counts: Partial<Record<ProductTab, number>>
  onChangeStatus: (productId: number, status: ProductStatus) => void
  onChangeVisibility: (productId: number, visibility: ProductVisibility) => void
  /** 상태·노출을 바꾸는 중인 상품. 그 줄의 관리 칸을 잠근다 */
  busyProductId?: number | null
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onRetry?: () => void
  errorMessage?: string
}

const tabOrder: ProductTab[] = [
  'ALL',
  ProductStatus.READY,
  ProductStatus.ON_SALE,
  ProductStatus.PAUSED,
  ProductStatus.ENDED,
]

const tabLabel = (tab: ProductTab) => (tab === 'ALL' ? '전체' : productStatusLabels[tab])

export const NOT_EDITABLE_REASON = '이 기기에서 등록하거나 고친 상품만 수정할 수 있어요'

/** 판매 상태 바로 바꾸기: 지금 상태 → 버튼 문구와 다음 상태. 판매 종료는 바꿀 수 없다 */
export function nextStatusAction(
  status: ProductStatus,
): { label: string; next: ProductStatus } | null {
  switch (status) {
    case ProductStatus.READY:
      return { label: '판매 시작', next: ProductStatus.ON_SALE }
    case ProductStatus.ON_SALE:
      return { label: '판매 중지', next: ProductStatus.PAUSED }
    case ProductStatus.PAUSED:
      return { label: '판매 재개', next: ProductStatus.ON_SALE }
    default:
      return null
  }
}

function Thumb({ url }: { url: string }) {
  return (
    <span className={classes.thumb} aria-hidden="true">
      {url ? <img src={url} alt="" /> : <ImageIcon size={18} />}
    </span>
  )
}

function LowStock() {
  return (
    <span className={classes.low}>
      <TriangleAlert size={14} aria-hidden="true" />
      판매 가능 수량이 {LOW_STOCK_THRESHOLD}개 이하예요
    </span>
  )
}

function StockCell({ product }: { product: SellerProductRow }) {
  return (
    <span className={classes.stock}>
      <span className="pd-num">{formatAmount(product.availableStock)}개</span>
      {product.soldOut && (
        <Badge color="neutral" size="sm">
          품절
        </Badge>
      )}
    </span>
  )
}

const visibilityText = (v: ProductVisibility) =>
  v === ProductVisibility.VISIBLE ? '공개' : '비공개'

function Actions({
  product,
  busy,
  onChangeStatus,
  onChangeVisibility,
}: {
  product: SellerProductRow
  busy: boolean
} & Pick<SellerProductsViewProps, 'onChangeStatus' | 'onChangeVisibility'>) {
  const action = nextStatusAction(product.status)
  return (
    <div className={classes.actions}>
      {action && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          aria-label={`${product.name} ${action.label}`}
          onClick={() => onChangeStatus(product.productId, action.next)}
        >
          {action.label}
        </Button>
      )}
      <Switch
        label={visibilityText(product.visibility)}
        aria-label={`${product.name} 노출`}
        checked={product.visibility === ProductVisibility.VISIBLE}
        disabled={busy}
        onChange={(event) =>
          onChangeVisibility(
            product.productId,
            event.currentTarget.checked ? ProductVisibility.VISIBLE : ProductVisibility.HIDDEN,
          )
        }
      />
      {product.editable ? (
        <Button
          component={Link}
          to={`/seller/products/${product.productId}/edit`}
          variant="subtle"
          size="sm"
          aria-label={`${product.name} 수정`}
        >
          수정
        </Button>
      ) : (
        <DisabledReason reason={NOT_EDITABLE_REASON}>
          <Button variant="subtle" size="sm" disabled aria-label={`${product.name} 수정`}>
            수정
          </Button>
        </DisabledReason>
      )}
    </div>
  )
}

export function SellerProductsView({
  status,
  products,
  tab,
  onTabChange,
  counts,
  onChangeStatus,
  onChangeVisibility,
  busyProductId = null,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRetry,
  errorMessage,
}: SellerProductsViewProps) {
  const addButton = (
    <Button
      component={Link}
      to="/seller/products/new"
      leftSection={<PackagePlus size={18} aria-hidden="true" />}
    >
      상품 등록
    </Button>
  )
  const actionProps = { onChangeStatus, onChangeVisibility }

  return (
    <div className={classes.root}>
      <PageHeader title="상품 관리" hideOnMobile actions={addButton} />
      <div className={classes.mobileAdd}>{addButton}</div>

      <Tabs value={tab} onChange={(value) => onTabChange((value ?? 'ALL') as ProductTab)}>
        <Tabs.List aria-label="판매 상태로 보기" className={classes.tabs}>
          {tabOrder.map((value) => (
            <Tabs.Tab key={value} value={value}>
              {tabLabel(value)}
              {counts[value] !== undefined && (
                <>
                  {' '}
                  <span className="pd-num">{formatAmount(counts[value])}</span>
                </>
              )}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <QueryState
        status={status === 'success' && products.length === 0 ? 'empty' : status}
        skeleton={
          <Stack gap="xs">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} h={64} />
            ))}
          </Stack>
        }
        loadingLabel="상품을 불러오고 있어요"
        onRetry={onRetry}
        errorMessage={errorMessage}
        empty={{
          icon: <PackagePlus />,
          title: tab === 'ALL' ? '아직 등록한 상품이 없어요' : `${tabLabel(tab)} 상품이 없어요`,
          description: '상품을 등록하면 이곳에서 판매 상태와 재고를 관리할 수 있어요.',
          action: { label: '상품 등록', to: '/seller/products/new' },
        }}
      >
        <div className={classes.tableWrap}>
          <Table aria-label="상품 목록" verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>사진</Table.Th>
                <Table.Th>상품명</Table.Th>
                <Table.Th className={classes.right}>판매가</Table.Th>
                <Table.Th className={classes.right}>판매 가능 수량</Table.Th>
                <Table.Th>판매 상태</Table.Th>
                <Table.Th>노출</Table.Th>
                <Table.Th>최근 수정</Table.Th>
                <Table.Th>
                  <VisuallyHidden>관리</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {products.map((product) => (
                <Table.Tr key={product.productId}>
                  <Table.Td>
                    <Thumb url={product.thumbnailUrl} />
                  </Table.Td>
                  <Table.Td>
                    <div className={classes.nameCell}>
                      {product.editable ? (
                        <Link
                          to={`/seller/products/${product.productId}/edit`}
                          className={classes.name}
                        >
                          {product.name}
                        </Link>
                      ) : (
                        <span className={classes.name}>{product.name}</span>
                      )}
                      {product.hasLowStock && <LowStock />}
                    </div>
                  </Table.Td>
                  <Table.Td className={classes.right}>
                    <PriceText amount={product.minSalePrice} size="S" />
                  </Table.Td>
                  <Table.Td className={classes.right}>
                    <StockCell product={product} />
                  </Table.Td>
                  <Table.Td>
                    <ProductStatusBadge status={product.status} />
                  </Table.Td>
                  <Table.Td>{visibilityText(product.visibility)}</Table.Td>
                  <Table.Td className={`pd-num ${classes.muted}`}>
                    {formatDate(product.updatedAt, 'dateTime')}
                  </Table.Td>
                  <Table.Td>
                    <Actions
                      product={product}
                      busy={busyProductId === product.productId}
                      {...actionProps}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        <ul className={classes.list} aria-label="상품 목록">
          {products.map((product) => {
            const body = (
              <>
                <Thumb url={product.thumbnailUrl} />
                <span className={classes.itemBody}>
                  <span className={classes.name}>{product.name}</span>
                  <span className={`pd-num ${classes.muted}`}>
                    <PriceText amount={product.minSalePrice} size="S" /> · 판매 가능{' '}
                    {formatAmount(product.availableStock)}개{product.soldOut && ' · 품절'} ·{' '}
                    {visibilityText(product.visibility)}
                  </span>
                  {product.hasLowStock && <LowStock />}
                </span>
                <ProductStatusBadge status={product.status} />
              </>
            )
            return (
              <li key={product.productId} className={classes.listItem}>
                {/* 안에 버튼·스위치가 있어 링크는 본문에만 건다 */}
                {product.editable ? (
                  <Link to={`/seller/products/${product.productId}/edit`} className={classes.item}>
                    {body}
                  </Link>
                ) : (
                  <div className={classes.item}>{body}</div>
                )}
                <Actions
                  product={product}
                  busy={busyProductId === product.productId}
                  {...actionProps}
                />
              </li>
            )
          })}
        </ul>

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
      </QueryState>
    </div>
  )
}
