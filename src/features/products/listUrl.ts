import { type ProductCategory, type ProductRegion, ProductSort } from '@/shared/api/types'

// 상품 목록 주소 /products?q&category&region&sort&page. 화면 상태(검색어·필터·정렬)는 URL searchParams가 기준이다.
// 정렬은 기본값이 아닐 때만 남긴다: 검색어가 있으면 관련도순, 없으면 최신순(서버 기본과 같다).

export type ProductListQuery = {
  q?: string | null
  category?: ProductCategory | null
  region?: ProductRegion | null
  sort?: ProductSort | null
}

/** 검색어가 있을 때와 없을 때의 기본 정렬. 검색어 없이는 관련도순이 최신순과 같아 고를 수 없다 */
export const defaultSortOf = (q?: string | null) => (q ? ProductSort.RELEVANCE : ProductSort.LATEST)

/** 고를 수 있는 정렬 (화면 순서) */
export const sortOptionsOf = (q?: string | null): ProductSort[] => [
  ...(q ? [ProductSort.RELEVANCE] : []),
  ProductSort.LATEST,
  ProductSort.PRICE_ASC,
  ProductSort.PRICE_DESC,
]

/** 목록 주소. 빈 값과 기본 정렬은 넣지 않고, page는 늘 빼서 첫 페이지부터 그린다 */
export function productListPath({ q, category, region, sort }: ProductListQuery) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (category) params.set('category', category)
  if (region) params.set('region', region)
  if (sort && sort !== defaultSortOf(q)) params.set('sort', sort)
  const search = params.toString()
  return search ? `/products?${search}` : '/products'
}
