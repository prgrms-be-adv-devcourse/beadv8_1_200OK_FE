import { HttpResponse, http } from 'msw'
import type { Wish } from '@/shared/api/types'
import { pageOf } from './_shared'

// 관심 상품(찜) 기본 응답. 상태를 기억하지 않는다(등록·해제는 204만). 목록·실패는 테스트에서 server.use(...)로 덮는다.

/** 기본으로 찜해 둔 상품 (최근 찜 순). 상품 fixtures에 있는 번호 */
export const sampleWishedIds = [103, 101]

export const wishesOf = (ids: number[]): Wish[] =>
  ids.map((productId, index) => ({
    productId,
    wishedAt: `2026-11-${String(20 - (index % 19)).padStart(2, '0')}T12:00:00`,
  }))

export const wishesHandlers = [
  http.get('*/api/v1/members/me/wishes', ({ request }) =>
    HttpResponse.json(pageOf(wishesOf(sampleWishedIds), new URL(request.url).searchParams)),
  ),
  http.put('*/api/v1/members/me/wishes/:productId', () => new HttpResponse(null, { status: 204 })),
  http.delete(
    '*/api/v1/members/me/wishes/:productId',
    () => new HttpResponse(null, { status: 204 }),
  ),
]
