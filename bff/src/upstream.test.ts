import { describe, expect, it } from 'vitest'
import { moduleForPath } from './upstream.ts'

describe('경로 → 백엔드 모듈', () => {
  it('상점 프로필 공개 조회는 판매자 하위 도메인이 있는 member로 보낸다', () => {
    expect(moduleForPath('/api/v1/stores/7')).toBe('member')
  })

  it('긴 접두어가 먼저다: 판매자 본인 상품은 product, 프로필은 member', () => {
    expect(moduleForPath('/api/v1/sellers/me/products/3')).toBe('product')
    expect(moduleForPath('/api/v1/sellers/me/profile')).toBe('member')
  })

  it('접두어가 단어 중간에서 겹치면 고르지 않는다', () => {
    expect(moduleForPath('/api/v1/storesx/7')).toBeNull()
  })
})
