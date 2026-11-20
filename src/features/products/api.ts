import { apiClient } from '@/shared/api/client'
import type {
  CategoryGroup,
  ProductListParams,
  ProductReview,
  ProductSearchPage,
} from '@/shared/api/types'

// 구매자 상품 조회. 모두 로그인 없이 부른다(04 Product). 상품 리뷰 목록·키워드는 shared/api/productReviews.ts

// ✅ GET /api/v1/products/categories
export async function fetchCategories(): Promise<CategoryGroup[]> {
  const { data } = await apiClient.get<CategoryGroup[]>('/api/v1/products/categories')
  return data
}

// ✅ GET /api/v1/products?keyword&categoryGroup&category&region&sort&page&size. 노출 상품.
// 검색어와 필터는 모두 만족하는 상품만. 정렬이 없으면 검색어가 있을 때 관련도순, 없을 때 최신순이고, 품절은 늘 뒤에 온다.
// 응답 suggestion은 검색어가 품목 이름의 오타로 보일 때의 바른 품목이다(결과는 원래 검색어 그대로).
// 50자 넘는 keyword·없는 enum·범위 밖 page·size(1~100)는 400, 검색 시간 초과는 503
export async function fetchProducts(params: ProductListParams): Promise<ProductSearchPage> {
  const { data } = await apiClient.get<ProductSearchPage>('/api/v1/products', { params })
  return data
}

// GET /api/v1/products/{productId}/reviews/me. ProductReview[] (페이지 아님, 여러 주문이면 여러 개).
// 상세는 비회원도 보는 공개 화면이라 401이어도 로그인 화면으로 보내지 않는다(내 리뷰만 빼고 그린다).
// TODO(api): 리뷰 목록과 같이 2026-10-18 로컬 서버에는 아직 없다
export async function fetchMyProductReviews(productId: number): Promise<ProductReview[]> {
  const { data } = await apiClient.get<ProductReview[]>(
    `/api/v1/products/${productId}/reviews/me`,
    {
      skipAuthRedirect: true,
    },
  )
  return data
}
