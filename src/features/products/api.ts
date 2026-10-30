import { apiClient } from '@/shared/api/client'
import type {
  CategoryGroup,
  ProductListParams,
  ProductPage,
  ProductReview,
  ProductSummary,
} from '@/shared/api/types'

// 구매자 상품 조회. 모두 로그인 없이 부른다(04 Product, 08 Review 상품 리뷰 목록).

// ✅ GET /api/v1/products/categories
export async function fetchCategories(): Promise<CategoryGroup[]> {
  const { data } = await apiClient.get<CategoryGroup[]>('/api/v1/products/categories')
  return data
}

// ✅ GET /api/v1/products?categoryGroup&category&region&page&size. 노출 상품 최신순.
// 검색어·정렬 파라미터는 없다(A-9). 없는 enum·범위 밖 page·size(1~100)는 400
export async function fetchProducts(
  params: ProductListParams,
): Promise<ProductPage<ProductSummary>> {
  const { data } = await apiClient.get<ProductPage<ProductSummary>>('/api/v1/products', { params })
  return data
}

// GET /api/v1/products/{productId}/reviews?page&size. 최신순.
// TODO(api): 2026-10-18 로컬 서버에는 리뷰 API가 아직 없어 404(No static resource). Bruno 계약대로 연결해 둔다
export async function fetchProductReviews(
  productId: number,
  params: { page: number; size: number },
): Promise<ProductPage<ProductReview>> {
  const { data } = await apiClient.get<ProductPage<ProductReview>>(
    `/api/v1/products/${productId}/reviews`,
    { params },
  )
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
