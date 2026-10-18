import { Button, Pagination, Skeleton, Stack, Table, Tabs, VisuallyHidden } from '@mantine/core'
import { Image as ImageIcon, PackagePlus, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { ProductStatus, ProductVisibility } from '@/shared/api/types'
import { LOW_STOCK_THRESHOLD } from '@/shared/lib/constants'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { productStatusLabels } from '@/shared/lib/labels'
import { PageHeader, ProductStatusBadge, QueryState } from '@/shared/ui'
import type { SellerProductRow } from '../types'
import classes from './SellerProductsView.module.css'

// S-04 상품 관리 /seller/products?status=. 시안: seller/SellerProducts, SellerProductsMobile
// 판매 상태 탭 5개(전체 · 판매 준비 · 판매 중 · 일시 중지 · 판매 종료) + 노출 여부. 데스크톱 표, 모바일 목록.
// TODO(api): 판매자 본인 상품 목록 API 없음(❌) → 2단계에서는 등록 직후 로컬 캐시로 목록을 유지한다(PLAN 2-6)

export type ProductTab = ProductStatus | 'ALL'

export type SellerProductsViewProps = {
  status: 'pending' | 'error' | 'success'
  products: SellerProductRow[]
  tab: ProductTab
  onTabChange: (tab: ProductTab) => void
  /** 탭별 개수 */
  counts: Record<ProductTab, number>
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onRetry?: () => void
}

const tabOrder: ProductTab[] = [
  'ALL',
  ProductStatus.READY,
  ProductStatus.ON_SALE,
  ProductStatus.PAUSED,
  ProductStatus.ENDED,
]

const tabLabel = (tab: ProductTab) => (tab === 'ALL' ? '전체' : productStatusLabels[tab])

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
      재고 {LOW_STOCK_THRESHOLD}개 이하 옵션이 있어요
    </span>
  )
}

export function SellerProductsView({
  status,
  products,
  tab,
  onTabChange,
  counts,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRetry,
}: SellerProductsViewProps) {
  const visibilityText = (v: ProductVisibility) =>
    v === ProductVisibility.VISIBLE ? '공개' : '비공개'
  const addButton = (
    <Button
      component={Link}
      to="/seller/products/new"
      leftSection={<PackagePlus size={18} aria-hidden="true" />}
    >
      상품 등록
    </Button>
  )

  return (
    <div className={classes.root}>
      <PageHeader title="상품 관리" hideOnMobile actions={addButton} />
      <div className={classes.mobileAdd}>{addButton}</div>

      <Tabs value={tab} onChange={(value) => onTabChange((value ?? 'ALL') as ProductTab)}>
        <Tabs.List aria-label="판매 상태로 보기" className={classes.tabs}>
          {tabOrder.map((value) => (
            <Tabs.Tab key={value} value={value}>
              {tabLabel(value)} <span className="pd-num">{formatAmount(counts[value] ?? 0)}</span>
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
                <Table.Th className={classes.right}>옵션</Table.Th>
                <Table.Th className={classes.right}>총 재고</Table.Th>
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
                      <Link
                        to={`/seller/products/${product.productId}/edit`}
                        className={classes.name}
                      >
                        {product.name}
                      </Link>
                      {product.hasLowStock && <LowStock />}
                    </div>
                  </Table.Td>
                  <Table.Td className={`pd-num ${classes.right}`}>
                    {formatAmount(product.optionCount)}개
                  </Table.Td>
                  <Table.Td className={`pd-num ${classes.right}`}>
                    {formatAmount(product.totalStock)}개
                  </Table.Td>
                  <Table.Td>
                    <ProductStatusBadge status={product.status} />
                  </Table.Td>
                  <Table.Td>{visibilityText(product.visibility)}</Table.Td>
                  <Table.Td className={`pd-num ${classes.muted}`}>
                    {formatDate(product.updatedAt, 'dateTime')}
                  </Table.Td>
                  <Table.Td>
                    <Button
                      component={Link}
                      to={`/seller/products/${product.productId}/edit`}
                      variant="outline"
                      size="sm"
                      aria-label={`${product.name} 수정`}
                    >
                      수정
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        <ul className={classes.list} aria-label="상품 목록">
          {products.map((product) => (
            <li key={product.productId}>
              <Link to={`/seller/products/${product.productId}/edit`} className={classes.item}>
                <Thumb url={product.thumbnailUrl} />
                <span className={classes.itemBody}>
                  <span className={classes.name}>{product.name}</span>
                  <span className={`pd-num ${classes.muted}`}>
                    옵션 {formatAmount(product.optionCount)}개 · 재고{' '}
                    {formatAmount(product.totalStock)}개 · {visibilityText(product.visibility)}
                  </span>
                  {product.hasLowStock && <LowStock />}
                </span>
                <ProductStatusBadge status={product.status} />
              </Link>
            </li>
          ))}
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
