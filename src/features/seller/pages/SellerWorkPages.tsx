import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import {
  MediaPurpose,
  OrderItemStatus,
  type ProductDetail,
  ProductStatus,
  ProductVisibility,
} from '@/shared/api/types'
import { ClaimState } from '@/shared/lib/claimState'
import { LOW_STOCK_THRESHOLD } from '@/shared/lib/constants'
import { QueryState, showToast, useMediaUploads } from '@/shared/ui'
import { cancelClaims, sellerOrders } from '../fixtures'
import type { CachedProduct } from '../productCache'
import { toProductFormFailure } from '../productErrors'
import { htmlToText, type ProductFormValues } from '../productSchema'
import {
  useCreateProduct,
  useDeleteProduct,
  useMemberId,
  useMyProducts,
  useSellerProductDetail,
  useUpdateProduct,
} from '../queries'
import {
  type CancelClaim,
  type SellerOrderRow,
  SellerOrderTab,
  type SellerProductRow,
} from '../types'
import { type ClaimTab, SellerClaimsView } from '../views/SellerClaimsView'
import { SellerOrdersView } from '../views/SellerOrdersView'
import { SellerProductFormView } from '../views/SellerProductFormView'
import { type ProductTab, SellerProductsView } from '../views/SellerProductsView'

// S-04 ~ S-07 판매자 상품·주문·취소 라우트 (판매자 센터 청크).
// 상품: ✅ 등록 POST /products, 수정 PUT /products/{id}(version, 판매 상태·노출 포함), 삭제 DELETE, 사진 POST /media/PRODUCT.
// TODO(api): 본인 상품 목록·상세(version · 재고 · 노출) API 없음(❌) → 이 브라우저에서 등록·수정한 상품을
//   productCache(localStorage)에 두고 목록·수정 처음 값으로 쓴다. 공개 상품은 구매자 상세로 옵션 id를 맞춘다.
// TODO(api): 판매자 주문 목록 API 없음(❌), 송장·지연·클레임은 📝 → 주문·취소는 fixtures를 화면 안에서만 바꾼다.

const productTabs: ProductTab[] = ['ALL', ...Object.values(ProductStatus)]

function toRow(product: CachedProduct): SellerProductRow {
  return {
    productId: product.productId,
    name: product.name,
    thumbnailUrl: product.imageUrls[0] ?? '',
    optionCount: product.options.length,
    totalStock: product.options.reduce((sum, o) => sum + o.totalStock, 0),
    status: product.status,
    visibility: product.visibility,
    updatedAt: product.updatedAt,
    hasLowStock: product.options.some((o) => o.totalStock <= LOW_STOCK_THRESHOLD),
  }
}

export function SellerProductsPage() {
  const [params, setParams] = useSearchParams()
  const tab = productTabs.find((value) => value === params.get('status')) ?? 'ALL'
  const query = useMyProducts(useMemberId())
  const rows = useMemo(() => (query.data ?? []).map(toRow), [query.data])
  const counts = Object.fromEntries(
    productTabs.map((value) => [
      value,
      value === 'ALL' ? rows.length : rows.filter((p) => p.status === value).length,
    ]),
  ) as Record<ProductTab, number>

  return (
    <SellerProductsView
      status={query.status}
      products={tab === 'ALL' ? rows : rows.filter((p) => p.status === tab)}
      tab={tab}
      onTabChange={(next) => setParams(next === 'ALL' ? {} : { status: next }, { replace: true })}
      counts={counts}
      onRetry={() => void query.refetch()}
    />
  )
}

/** /seller/products/new 와 /seller/products/:productId/edit 가 같이 쓴다 */
export function SellerProductFormPage() {
  const { productId } = useParams()
  if (productId === undefined) return <ProductCreate />
  return <ProductEdit key={productId} productId={Number(productId)} />
}

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
      description: htmlToText(cached.descriptionHtml),
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
    description: htmlToText(detail.descriptionHtml),
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
  const products = useMyProducts(memberId)
  const detail = useSellerProductDetail(productId)
  // 최신 내용 불러오기: 상세를 다시 받고 폼을 새로 그린다
  const [loadCount, setLoadCount] = useState(0)
  const cached = products.data?.find((p) => p.productId === productId)

  if (Number.isInteger(productId) && (products.isPending || detail.isPending)) {
    return <QueryState status="pending" loadingLabel="상품 정보를 불러오고 있어요" />
  }
  if (!cached) {
    // TODO(api): 판매자 상품 상세 API가 없어 이 브라우저에서 등록·수정한 상품만 고칠 수 있다
    return (
      <QueryState
        status="notFound"
        notFound={{
          title: '이 상품 정보를 불러오지 못했어요',
          description:
            '지금은 이 기기에서 등록한 상품만 고칠 수 있어요. 상품 관리에서 다시 골라 주세요.',
          action: { label: '상품 관리', to: '/seller/products' },
        }}
      />
    )
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

const tabOf = (row: SellerOrderRow): SellerOrderTab => {
  switch (row.status) {
    case OrderItemStatus.SHIPPING:
      return SellerOrderTab.SHIPPING
    case OrderItemStatus.DELIVERED:
    case OrderItemStatus.PURCHASE_CONFIRMED:
      return SellerOrderTab.DELIVERED
    case OrderItemStatus.CANCELED:
      return SellerOrderTab.CANCELED
    default:
      return SellerOrderTab.WAITING
  }
}

export function SellerOrdersPage() {
  const [tab, setTab] = useState(SellerOrderTab.WAITING)
  const [orders, setOrders] = useState(sellerOrders)
  const counts = Object.fromEntries(
    Object.values(SellerOrderTab).map((value) => [
      value,
      orders.filter((o) => tabOf(o) === value).length,
    ]),
  ) as Record<SellerOrderTab, number>
  const update = (id: number, patch: Partial<SellerOrderRow>) =>
    setOrders((current) => current.map((o) => (o.shipmentId === id ? { ...o, ...patch } : o)))

  return (
    <SellerOrdersView
      status="success"
      orders={orders.filter((o) => tabOf(o) === tab)}
      tab={tab}
      onTabChange={setTab}
      counts={counts}
      onRegisterInvoice={(id, input) => {
        update(id, { status: OrderItemStatus.SHIPPING, ...input })
        showToast({ message: '송장을 등록했어요' })
      }}
      onNotifyDelay={(id, input) => {
        update(id, {
          delay: { reason: input.reasonDetail ?? '출고 지연', newShipDate: input.newShipDate },
        })
        showToast({ message: '출고 지연을 알렸어요' })
      }}
      onSellerCancel={(id) => {
        update(id, { status: OrderItemStatus.CANCELED, note: '판매자 취소 · 환불 완료' })
        showToast({ message: '주문을 취소하고 환불했어요' })
      }}
      onAnswerAddressChange={(id, approve) => {
        const row = orders.find((o) => o.shipmentId === id)
        update(id, {
          addressChange: null,
          ...(approve && row?.addressChange ? { address: row.addressChange.after } : {}),
        })
        showToast({ message: approve ? '배송지 변경을 승인했어요' : '배송지 변경을 거절했어요' })
      }}
    />
  )
}

export function SellerClaimsPage() {
  const [tab, setTab] = useState<ClaimTab>('PENDING')
  const [claims, setClaims] = useState(cancelClaims)
  const isPending = (c: CancelClaim) => c.state === ClaimState.CLAIM_PENDING
  const update = (id: number, patch: Partial<CancelClaim>) =>
    setClaims((current) => current.map((c) => (c.claimId === id ? { ...c, ...patch } : c)))

  return (
    <SellerClaimsView
      status="success"
      claims={claims.filter((c) => (tab === 'PENDING' ? isPending(c) : !isPending(c)))}
      tab={tab}
      onTabChange={setTab}
      counts={{
        PENDING: claims.filter(isPending).length,
        DONE: claims.filter((c) => !isPending(c)).length,
      }}
      onApprove={(id) => {
        update(id, { state: ClaimState.CLAIM_APPROVED })
        showToast({ message: '취소를 승인하고 환불했어요' })
      }}
      onReject={(id, reason) => {
        update(id, { state: ClaimState.CLAIM_REJECTED, rejectReason: reason })
        showToast({ message: '취소 요청을 거절했어요' })
      }}
    />
  )
}
