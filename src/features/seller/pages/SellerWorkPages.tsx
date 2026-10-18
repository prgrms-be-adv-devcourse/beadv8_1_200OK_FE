import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { OrderItemStatus, ProductStatus } from '@/shared/api/types'
import { ClaimState } from '@/shared/lib/claimState'
import { showToast } from '@/shared/ui'
import { appleFormValues, cancelClaims, sellerOrders, sellerProducts } from '../fixtures'
import { type CancelClaim, type SellerOrderRow, SellerOrderTab } from '../types'
import { type ClaimTab, SellerClaimsView } from '../views/SellerClaimsView'
import { SellerOrdersView } from '../views/SellerOrdersView'
import { SellerProductFormView } from '../views/SellerProductFormView'
import { type ProductTab, SellerProductsView } from '../views/SellerProductsView'
import { usePhotoDraft } from './usePhotoDraft'

// S-04 ~ S-07 판매자 상품·주문·취소 라우트 (판매자 센터 청크). 1단계: fixtures를 화면 안에서만 바꾼다.
// TODO(api): 2-6 상품 등록 POST /products, 수정 PUT(version), 상태 PATCH .../status, 노출 PATCH .../visibility, 삭제,
//   미디어 POST /media/PRODUCT (✅ 임시 헤더). 본인 상품 목록·주문 목록은 API 없음(❌), 송장·지연·클레임은 📝

const productTabs: ProductTab[] = ['ALL', ...Object.values(ProductStatus)]

export function SellerProductsPage() {
  const [params, setParams] = useSearchParams()
  const tab = productTabs.find((value) => value === params.get('status')) ?? 'ALL'
  const counts = Object.fromEntries(
    productTabs.map((value) => [
      value,
      value === 'ALL'
        ? sellerProducts.length
        : sellerProducts.filter((p) => p.status === value).length,
    ]),
  ) as Record<ProductTab, number>

  return (
    <SellerProductsView
      status="success"
      products={tab === 'ALL' ? sellerProducts : sellerProducts.filter((p) => p.status === tab)}
      tab={tab}
      onTabChange={(next) => setParams(next === 'ALL' ? {} : { status: next }, { replace: true })}
      counts={counts}
    />
  )
}

export function SellerProductFormPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const editing = productId !== undefined
  const photos = usePhotoDraft(
    editing ? [1, 2, 3].map((n) => ({ id: `saved${n}`, url: '', alt: `상품 사진 ${n}` })) : [],
  )

  return (
    <SellerProductFormView
      key={productId ?? 'new'}
      mode={editing ? 'edit' : 'create'}
      defaultValues={editing ? appleFormValues : undefined}
      photos={photos.items}
      onAddPhotos={photos.add}
      onRemovePhoto={photos.remove}
      onMovePhoto={photos.move}
      onSubmit={() => {
        showToast({ message: editing ? '상품을 저장했어요' : '상품을 등록했어요' })
        navigate('/seller/products')
      }}
      onDelete={() => {
        showToast({ message: '상품을 삭제했어요' })
        navigate('/seller/products', { replace: true })
      }}
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
