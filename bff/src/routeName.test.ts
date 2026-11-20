import { describe, expect, it } from 'vitest'
import { routeName } from './routeName.ts'

describe('routeName', () => {
  it.each([
    // A1
    ['GET', '/api/v1/products/12', 'GET /api/v1/products/:id'],
    // A2
    ['POST', '/api/v1/orders/3/items/9/confirm', 'POST /api/v1/orders/:id/items/:id/confirm'],
    // A3
    ['GET', '/api/v1/products?page=0&size=20', 'GET /api/v1/products'],
    // A4: enum 구간은 그대로 둔다
    ['POST', '/api/v1/media/PRODUCT_IMAGE', 'POST /api/v1/media/PRODUCT_IMAGE'],
    // A5: 문자열 충전 번호
    [
      'GET',
      '/api/v1/wallets/me/charges/CHG-20261120-ab12',
      'GET /api/v1/wallets/me/charges/:chargeNo',
    ],
    // A6: 끝 슬래시
    ['GET', '/api/v1/cart/', 'GET /api/v1/cart'],
    ['GET', '/api/v1/payouts/me/5/items', 'GET /api/v1/payouts/me/:id/items'],
    ['GET', '/api/v1/wallets/me/charges', 'GET /api/v1/wallets/me/charges'],
    ['get', '/', 'GET /'],
  ])('%s %s → %s', (method, pathname, expected) => {
    expect(routeName(method, pathname)).toBe(expected)
  })

  it('끝 슬래시가 있어도 없을 때와 같은 이름이다', () => {
    expect(routeName('GET', '/api/v1/cart/')).toBe(routeName('GET', '/api/v1/cart'))
  })
})
