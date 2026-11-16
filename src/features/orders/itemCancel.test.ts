import { type Refund, RefundStatus } from '@/shared/api/refund'
import { type OrderDetailItem, OrderItemStatus } from '@/shared/api/types'
import { myRefunds } from './fixtures'
import { itemCancelOf } from './itemCancel'

const item: OrderDetailItem = {
  orderItemId: 1842,
  productId: 102,
  productOptionId: 1021,
  productName: '해남 꿀고구마 베니하루카',
  productOptionName: '3kg 한입 크기',
  unitPrice: 15900,
  quantity: 3,
  itemAmount: 47700,
  status: OrderItemStatus.PREPARING,
}

const base = myRefunds[0] as Refund
const refund = (status: RefundStatus, quantity = 1): Refund => ({ ...base, status, quantity })

describe('itemCancelOf', () => {
  it('출고 전이 아니면 요청할 수 없다', () => {
    expect(itemCancelOf({ ...item, status: OrderItemStatus.SHIPPING }, [])).toEqual({
      kind: 'unavailable',
    })
  })

  it('승인 대기·처리 중 요청이 있으면 그 요청을 돌려준다', () => {
    for (const status of [RefundStatus.REQUESTED, RefundStatus.PROCESSING]) {
      expect(itemCancelOf(item, [refund(status)])).toMatchObject({ kind: 'inProgress' })
    }
  })

  it('처리 중·완료된 개수만 빼고, 거절·철회된 요청은 세지 않는다', () => {
    const refunds = [
      refund(RefundStatus.COMPLETED, 1),
      refund(RefundStatus.REJECTED, 2),
      refund(RefundStatus.WITHDRAWN, 2),
    ]
    expect(itemCancelOf(item, refunds)).toEqual({ kind: 'available', maxQuantity: 2 })
  })

  it('산 개수를 다 취소했으면 더 요청할 수 없다', () => {
    expect(itemCancelOf(item, [refund(RefundStatus.COMPLETED, 3)])).toEqual({
      kind: 'allCanceled',
    })
  })

  it('다른 주문 상품의 요청은 보지 않는다', () => {
    expect(itemCancelOf(item, [{ ...refund(RefundStatus.REQUESTED), orderItemId: 1 }])).toEqual({
      kind: 'available',
      maxQuantity: 3,
    })
  })
})
