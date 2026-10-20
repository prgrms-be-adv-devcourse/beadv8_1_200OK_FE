import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { uploadMedia } from '@/shared/api/media'
import {
  MediaPurpose,
  type ProductDetail,
  ProductStatus,
  ProductVisibility,
  type SellerProductSummary,
} from '@/shared/api/types'
import { LOW_STOCK_THRESHOLD } from '@/shared/lib/constants'
import { QueryState, showToast, useMediaUploads } from '@/shared/ui'
import { type CachedProduct, readCachedProducts } from '../productCache'
import { toProductFormFailure } from '../productErrors'
import type { ProductFormValues } from '../productSchema'
import {
  PRODUCT_PAGE_SIZE,
  useChangeProductStatus,
  useChangeProductVisibility,
  useCreateProduct,
  useDeleteProduct,
  useMemberId,
  useMyProducts,
  useSellerProductDetail,
  useUpdateProduct,
} from '../queries'
import type { SellerProductRow } from '../types'
import { SellerClaimsNotConnectedView } from '../views/SellerClaimsView'
import { SellerOrdersNotConnectedView } from '../views/SellerOrdersView'
import { SellerProductFormView } from '../views/SellerProductFormView'
import { type ProductTab, SellerProductsView } from '../views/SellerProductsView'

// S-04 ~ S-07 판매자 상품·주문·취소 라우트 (판매자 센터 청크).
// 상품: ✅ 목록 GET /sellers/me/products, 등록 POST /products, 수정 PUT /products/{id}(version, 판매 상태·노출 포함),
//   상태·노출 PATCH /products/{id}/status · /visibility(목록에서 바로), 삭제 DELETE, 사진 POST /media/PRODUCT.
// TODO(api): 판매자 상품 상세(version · 옵션 재고 · 옵션 id) API 없음(❌) → 이 브라우저에서 등록·수정한 상품을
//   productCache(localStorage)에 두고 수정 처음 값으로 쓴다. 캐시에 없는 상품은 수정을 막는다. 공개 상품은 구매자 상세로 옵션 id를 맞춘다.
// TODO(api): 📝 판매자 주문 목록·클레임(취소 요청) API 없음 → 주문·출고와 취소 요청 처리는 화면 전체를 연결 전(NotConnected)으로 둔다.

const productTabs: ProductTab[] = ['ALL', ...Object.values(ProductStatus)]

function toRow(summary: SellerProductSummary, cachedIds: Set<number>): SellerProductRow {
  return {
    productId: summary.productId,
    name: summary.name,
    thumbnailUrl: summary.thumbnailUrl,
    minSalePrice: summary.minSalePrice,
    availableStock: summary.availableStock,
    soldOut: summary.soldOut,
    status: summary.status,
    visibility: summary.visibility,
    updatedAt: summary.updatedAt,
    hasLowStock: summary.availableStock <= LOW_STOCK_THRESHOLD,
    editable: cachedIds.has(summary.productId),
  }
}

export function SellerProductsPage() {
  const [params, setParams] = useSearchParams()
  const tab = productTabs.find((value) => value === params.get('status')) ?? 'ALL'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const memberId = useMemberId()
  const query = useMyProducts({
    status: tab === 'ALL' ? undefined : tab,
    page: page - 1,
    size: PRODUCT_PAGE_SIZE,
  })
  const changeStatus = useChangeProductStatus(memberId)
  const changeVisibility = useChangeProductVisibility(memberId)

  // 캐시(이 기기에서 등록·수정한 상품)는 서버 목록이 새로 올 때마다 다시 읽어 수정 가능 여부를 맞춘다
  const rows = useMemo(() => {
    const cachedIds = new Set(
      memberId === null ? [] : readCachedProducts(memberId).map((p) => p.productId),
    )
    return (query.data?.content ?? []).map((summary) => toRow(summary, cachedIds))
  }, [memberId, query.data])
  const busyProductId = changeStatus.isPending
    ? (changeStatus.variables?.productId ?? null)
    : changeVisibility.isPending
      ? (changeVisibility.variables?.productId ?? null)
      : null

  const setSearch = (next: { status?: ProductTab; page?: number }) => {
    const search: Record<string, string> = {}
    const status = next.status ?? tab
    if (status !== 'ALL') search.status = status
    if (next.page !== undefined && next.page > 1) search.page = String(next.page)
    setParams(search, { replace: true })
  }

  return (
    <SellerProductsView
      status={query.isError ? 'error' : query.isPending ? 'pending' : 'success'}
      products={rows}
      tab={tab}
      onTabChange={(next) => setSearch({ status: next, page: 1 })}
      counts={{ [tab]: query.data?.totalElements }}
      page={page}
      totalPages={query.data?.totalPages ?? 1}
      onPageChange={(next) => setSearch({ page: next })}
      busyProductId={busyProductId}
      onChangeStatus={(productId, status) =>
        changeStatus.mutate(
          { productId, status },
          {
            onSuccess: () => showToast({ message: '판매 상태를 바꿨어요' }),
            onError: (error) =>
              showToast({
                message: error.status === 404 ? '이미 삭제된 상품이에요' : error.detail,
              }),
          },
        )
      }
      onChangeVisibility={(productId, visibility) =>
        changeVisibility.mutate(
          { productId, visibility },
          {
            onSuccess: () =>
              showToast({
                message: visibility === ProductVisibility.VISIBLE ? '노출을 바꿨어요' : '숨겼어요',
              }),
            onError: (error) =>
              showToast({
                message: error.status === 404 ? '이미 삭제된 상품이에요' : error.detail,
              }),
          },
        )
      }
      onRetry={() => void query.refetch()}
      errorMessage={query.error?.detail}
    />
  )
}

/** /seller/products/new 와 /seller/products/:productId/edit 가 같이 쓴다 */
export function SellerProductFormPage() {
  const { productId } = useParams()
  if (productId === undefined) return <ProductCreate />
  return <ProductEdit key={productId} productId={Number(productId)} />
}

/** 상세설명 에디터에 넣은 사진을 올리고 서버 주소를 돌려준다. 실패하면 ApiError(서버 detail)를 던진다 */
const uploadDescriptionImage = async (file: File) =>
  (await uploadMedia(MediaPurpose.PRODUCT, file)).url

function ProductCreate() {
  const navigate = useNavigate()
  const memberId = useMemberId()
  const photos = useMediaUploads(MediaPurpose.PRODUCT)
  const create = useCreateProduct(memberId)
  const failure = useMemo(() => toProductFormFailure(create.error), [create.error])

  return (
    <SellerProductFormView
      mode="create"
      photos={photos.items}
      onAddPhotos={photos.add}
      onRemovePhoto={photos.remove}
      onMovePhoto={photos.move}
      photoError={photos.error}
      uploading={photos.uploading}
      onDescriptionImageUpload={uploadDescriptionImage}
      submitting={create.isPending}
      errorMessage={failure.message}
      fieldErrors={failure.fieldErrors}
      onSubmit={(values) =>
        create.mutate(values, {
          onSuccess: () => {
            showToast({ message: '상품을 등록했어요' })
            navigate('/seller/products')
          },
        })
      }
    />
  )
}

/** 수정 화면 처음 값. 공개 상품이면 서버 상세가 최신이라 그것을 쓰고, 재고는 상세에 없어 저장해 둔 값을 옵션명으로 맞춘다 */
function toFormValues(cached: CachedProduct, detail: ProductDetail | undefined): ProductFormValues {
  if (!detail) {
    return {
      category: cached.category,
      name: cached.name,
      region: cached.region,
      description: cached.descriptionHtml,
      options: cached.options,
      status: cached.status,
      visibility: cached.visibility,
    }
  }
  const stock = new Map(cached.options.map((o) => [o.name, o.totalStock]))
  return {
    category: detail.category,
    name: detail.name,
    region: detail.region,
    description: detail.descriptionHtml,
    options: detail.options.map((o) => ({
      id: o.optionId,
      name: o.name,
      salePrice: o.salePrice,
      listPrice: o.listPrice,
      // 다른 곳에서 추가한 옵션은 재고를 몰라 비워 두고 다시 입력받는다
      totalStock: stock.get(o.name) as number,
    })),
    status: detail.status,
    visibility: ProductVisibility.VISIBLE,
  }
}

function ProductEdit({ productId }: { productId: number }) {
  const memberId = useMemberId()
  const detail = useSellerProductDetail(productId)
  // 최신 내용 불러오기: 상세를 다시 받고 폼을 새로 그린다
  const [loadCount, setLoadCount] = useState(0)
  // TODO(api): 판매자 상품 상세 API가 없어 version·재고는 productCache(이 기기에서 등록·수정한 상품)에서만 받는다.
  //   없는 상품에 version 0으로 보내면 409가 나고 되돌릴 길이 없어 수정 자체를 막는다.
  const cached = useMemo(
    () =>
      memberId === null
        ? undefined
        : readCachedProducts(memberId).find((p) => p.productId === productId),
    [memberId, productId],
  )

  if (!cached) {
    return (
      <QueryState
        status="notFound"
        notFound={{
          title: '이 상품은 여기서 수정할 수 없어요',
          description:
            '지금은 이 기기에서 등록하거나 고친 상품만 수정할 수 있어요. 판매 상태와 노출은 상품 관리 목록에서 바로 바꿀 수 있어요.',
          action: { label: '상품 관리', to: '/seller/products' },
        }}
      />
    )
  }
  if (detail.isPending) {
    return <QueryState status="pending" loadingLabel="상품 정보를 불러오고 있어요" />
  }
  return (
    <ProductEditForm
      key={loadCount}
      memberId={memberId}
      product={cached}
      defaultValues={toFormValues(cached, detail.data)}
      imageUrls={detail.data?.imageUrls ?? cached.imageUrls}
      onReload={() => void detail.refetch().then(() => setLoadCount((count) => count + 1))}
    />
  )
}

function ProductEditForm({
  memberId,
  product,
  defaultValues,
  imageUrls,
  onReload,
}: {
  memberId: number | null
  product: CachedProduct
  defaultValues: ProductFormValues
  imageUrls: string[]
  onReload: () => void
}) {
  const navigate = useNavigate()
  const photos = useMediaUploads(
    MediaPurpose.PRODUCT,
    imageUrls.map((url, i) => ({ url, alt: `상품 사진 ${i + 1}` })),
  )
  const update = useUpdateProduct(memberId, product.productId)
  const remove = useDeleteProduct(memberId, product.productId)
  const failure = useMemo(() => toProductFormFailure(update.error), [update.error])
  const toList = () => navigate('/seller/products', { replace: true })

  return (
    <SellerProductFormView
      mode="edit"
      defaultValues={defaultValues}
      photos={photos.items}
      onAddPhotos={photos.add}
      onRemovePhoto={photos.remove}
      onMovePhoto={photos.move}
      photoError={photos.error}
      uploading={photos.uploading}
      onDescriptionImageUpload={uploadDescriptionImage}
      submitting={update.isPending}
      errorMessage={failure.message}
      fieldErrors={failure.fieldErrors}
      conflict={failure.conflict}
      // TODO(api): version을 줄 API가 없어 최신 내용을 불러와도 저장해 둔 version을 그대로 쓴다
      onReload={onReload}
      onSubmit={(values) =>
        update.mutate(
          {
            ...values,
            status: values.status ?? product.status,
            visibility: values.visibility ?? product.visibility,
            version: product.version,
          },
          {
            onSuccess: () => {
              showToast({ message: '상품을 저장했어요' })
              navigate('/seller/products')
            },
          },
        )
      }
      deleting={remove.isPending}
      onDelete={() =>
        remove.mutate(undefined, {
          onSuccess: () => {
            showToast({ message: '상품을 삭제했어요' })
            toList()
          },
          onError: (error) => {
            showToast({ message: error.status === 404 ? '이미 삭제된 상품이에요' : error.detail })
            if (error.status === 404) toList()
          },
        })
      }
    />
  )
}

// TODO(api): 📝 판매자 주문 목록 API 없음. 출고 POST /seller/shipments/{shipmentId}/dispatch는 있지만
//   shipmentId를 받을 곳이 없어 화면 전체를 연결 전으로 둔다. 출고 지연·판매자 취소·배송지 변경 응답도 그 뒤에 붙인다.
export function SellerOrdersPage() {
  return <SellerOrdersNotConnectedView />
}

// TODO(api): 📝 판매자 취소 요청(클레임) 목록·승인·거절 API 없음 → 화면 전체를 연결 전으로 둔다.
export function SellerClaimsPage() {
  return <SellerClaimsNotConnectedView />
}
