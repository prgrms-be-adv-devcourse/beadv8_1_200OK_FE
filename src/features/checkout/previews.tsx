import type { ScreenPreview } from '@/shared/lib/screenPreview'
import {
  BALANCE_ENOUGH,
  BALANCE_SHORT,
  checkoutSample,
  SAMPLE_ORDER_ID,
  savedAddress,
  sellerNames,
} from './fixtures'
import { CheckoutCompleteView } from './views/CheckoutCompleteView'
import { CheckoutView, type CheckoutViewProps } from './views/CheckoutView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다)

const checkout = (props: Partial<CheckoutViewProps> = {}) => (
  <CheckoutView
    status="success"
    checkout={checkoutSample}
    sellerNames={sellerNames}
    balance={BALANCE_ENOUGH}
    defaultAddress={savedAddress}
    onPay={() => {}}
    onRetry={() => {}}
    {...props}
  />
)

const priceChanged = {
  ...checkoutSample,
  sellerGroups: checkoutSample.sellerGroups.map((group) =>
    group.sellerId === 7
      ? {
          ...group,
          items: group.items.map((item) => ({ ...item, unitPrice: 24900, itemAmount: 24900 })),
        }
      : group,
  ),
  totalProductAmount: 40800,
  totalAmount: 40800,
}

export const checkoutPreviews: ScreenPreview[] = [
  {
    id: 'checkout',
    title: 'B-04 주문서',
    layout: 'public',
    path: '/checkout',
    states: [
      { id: 'enough', label: '잔액 충분', render: () => checkout() },
      { id: 'short', label: '잔액 부족', render: () => checkout({ balance: BALANCE_SHORT }) },
      { id: 'no-address', label: '배송지 없음', render: () => checkout({ defaultAddress: null }) },
      {
        id: 'processing',
        label: '결제 처리 중',
        render: () => checkout({ paymentState: 'processing' }),
      },
      { id: 'failed', label: '결제 실패', render: () => checkout({ paymentState: 'failed' }) },
      {
        id: 'price-changed',
        label: '금액 변경 (409)',
        render: () =>
          checkout({ checkout: priceChanged, previousTotal: checkoutSample.totalAmount }),
      },
      { id: 'loading', label: '로딩', render: () => checkout({ status: 'pending' }) },
      { id: 'error', label: '불러오기 실패', render: () => checkout({ status: 'error' }) },
      {
        id: 'empty',
        label: '주문할 상품 없음',
        render: () => checkout({ checkout: { ...checkoutSample, sellerGroups: [] } }),
      },
    ],
  },
  {
    id: 'checkout-complete',
    title: 'B-06 주문 완료',
    layout: 'public',
    path: '/checkout/complete',
    states: [
      {
        id: 'done',
        label: '주문 완료',
        render: () => (
          <CheckoutCompleteView
            orderId={SAMPLE_ORDER_ID}
            checkout={checkoutSample}
            sellerNames={sellerNames}
            balanceAfter={BALANCE_ENOUGH - checkoutSample.totalAmount}
          />
        ),
      },
      {
        id: 'id-only',
        label: '주문번호만 (새로고침 후)',
        render: () => <CheckoutCompleteView orderId={SAMPLE_ORDER_ID} />,
      },
    ],
  },
]
