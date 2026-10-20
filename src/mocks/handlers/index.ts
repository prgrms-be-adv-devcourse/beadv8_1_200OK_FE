import type { RequestHandler } from 'msw'
import { adminHandlers } from './admin'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { checkoutHandlers } from './checkout'
import { ordersHandlers } from './orders'
import { productHandlers } from './products'
import { reviewHandlers } from './reviews'
import { sellerHandlers } from './seller'
import { sellerApplyHandlers } from './sellerApply'
import { shipmentsHandlers } from './shipments'
import { walletHandlers } from './wallet'

// 테스트 기본 핸들러. feature별 핸들러를 만들면 여기 모은다. 테스트마다 다른 응답은 server.use(...)로 덮는다.
// 순서: checkout(GET /orders/checkout)이 orders(GET /orders/:orderId)보다 앞이어야 한다.
export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...productHandlers,
  ...reviewHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...ordersHandlers,
  ...shipmentsHandlers,
  ...walletHandlers,
  ...sellerHandlers,
  ...sellerApplyHandlers,
  ...adminHandlers,
]
