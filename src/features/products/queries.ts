import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQueries,
  useQuery,
} from '@tanstack/react-query'
import { isApiError } from '@/shared/api/ApiError'
import { productDetailQueryOptions } from '@/shared/api/productDetail'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import type {
  CategoryGroup,
  ProductCategory,
  ProductPage,
  ProductRegion,
  ProductSummary,
} from '@/shared/api/types'
import { fetchCategories, fetchMyProductReviews, fetchProductReviews, fetchProducts } from './api'
import type { CategoryOption, ListStatus } from './types'

// 상품 쿼리 키·훅. 상품 데이터는 [products, ...], 상품 리뷰 목록은 [reviews, ...]로 시작한다.
// 리뷰를 쓰거나 지운 쪽(2-5)은 두 접두어로 무효화한다: 리뷰 목록 + 상품의 reviewCount·averageRating

const PRODUCT_STALE_TIME = 60_000
const CATEGORY_STALE_TIME = 60 * 60_000

export const PRODUCT_PAGE_SIZE = 20
export const REVIEW_PAGE_SIZE = 20

export type ProductFilters = { category?: ProductCategory; region?: ProductRegion }

export const productKeys = {
  all: [queryKeyPrefix.products] as const,
  categories: () => [queryKeyPrefix.products, 'categories'] as const,
  lists: () => [queryKeyPrefix.products, 'list'] as const,
  list: (params: ProductFilters & { page: number; size: number }) =>
    [queryKeyPrefix.products, 'list', params] as const,
  details: () => [queryKeyPrefix.products, 'detail'] as const,
  // 상세 키·조회는 shared/api/productDetail.ts (cart·reviews·seller도 씀)
  detail: (productId: number) => productDetailQueryOptions(productId).queryKey,
}

export const productReviewKeys = {
  all: [queryKeyPrefix.reviews, 'product'] as const,
  list: (productId: number) => [queryKeyPrefix.reviews, 'product', productId, 'list'] as const,
  mine: (productId: number, memberId: number) =>
    [queryKeyPrefix.reviews, 'product', productId, 'me', memberId] as const,
}

const toCategoryOptions = (groups: CategoryGroup[]): CategoryOption[] =>
  groups.flatMap((group) =>
    group.categories.map((category) => ({ code: category.code, label: category.description })),
  )

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: productKeys.categories(),
    queryFn: fetchCategories,
    staleTime: CATEGORY_STALE_TIME,
    select: toCategoryOptions,
  })

/** 카테고리 탭·칩 (A-1). data는 { code, label }[] */
export function useCategories() {
  return useQuery(categoriesQueryOptions())
}

export const productListQueryOptions = (params: ProductFilters & { page: number; size: number }) =>
  queryOptions({
    queryKey: productKeys.list(params),
    queryFn: () => fetchProducts(params),
    staleTime: PRODUCT_STALE_TIME,
  })

/** productId가 올바르지 않으면 요청하지 않는다(화면은 404로 그린다) */
export function useProduct(productId: number | null) {
  return useQuery({
    ...productDetailQueryOptions(productId ?? 0),
    enabled: productId !== null,
  })
}

export const productReviewsQueryOptions = (productId: number) =>
  infiniteQueryOptions({
    queryKey: productReviewKeys.list(productId),
    queryFn: ({ pageParam }) =>
      fetchProductReviews(productId, { page: pageParam, size: REVIEW_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    staleTime: PRODUCT_STALE_TIME,
  })

/** 상품 리뷰 목록(최신순, 더 보기). enabled가 false면 부르지 않는다 */
export function useProductReviews(productId: number, enabled: boolean) {
  return useInfiniteQuery({ ...productReviewsQueryOptions(productId), enabled })
}

/** 이 상품의 내 리뷰. 로그인했을 때만(memberId가 있을 때) 부른다 */
export function useMyProductReviews(productId: number, memberId: number | undefined) {
  return useQuery({
    queryKey: productReviewKeys.mine(productId, memberId ?? 0),
    queryFn: () => fetchMyProductReviews(productId),
    staleTime: PRODUCT_STALE_TIME,
    enabled: memberId !== undefined,
  })
}

/**
 * 상품 목록 0 ~ lastPage 페이지를 이어 붙인다. lastPage는 URL의 page라 새로 고쳐도 본 만큼 다시 그린다.
 * 서버의 전체 페이지 수를 넘는 page는 있는 데까지만 부른다.
 */
export function useProductPages(filters: ProductFilters, lastPage: number) {
  const pageOptions = (page: number) =>
    productListQueryOptions({ ...filters, page, size: PRODUCT_PAGE_SIZE })

  const first = useQuery(pageOptions(0))
  const loadedLast = first.data ? Math.min(lastPage, Math.max(first.data.totalPages - 1, 0)) : 0
  const rest = useQueries({
    queries: Array.from({ length: loadedLast }, (_, i) => pageOptions(i + 1)),
  })

  const all = [first, ...rest]
  // 이미 그린 데이터가 있으면 다시 불러오다 실패해도 그대로 둔다
  const failed = all.filter((query) => query.isError && query.data === undefined)
  const pages = all.flatMap((query) => (query.data ? [query.data] : []))
  const status: ListStatus =
    failed.length > 0 ? 'error' : pages.length < all.length ? 'pending' : 'success'

  const last: ProductPage<ProductSummary> | undefined = pages.at(-1)
  // 사이에 새 상품이 등록되면 페이지 경계가 밀려 같은 상품이 두 번 올 수 있다
  const seen = new Set<number>()
  const items = pages
    .flatMap((page) => page.content)
    .filter((product) => !seen.has(product.productId) && seen.add(product.productId))

  return {
    status,
    items,
    totalCount: last?.totalElements ?? 0,
    hasMore: last ? last.page + 1 < last.totalPages : false,
    nextPage: loadedLast + 1,
    nextPageOptions: pageOptions(loadedLast + 1),
    error: failed[0]?.error ?? null,
    retry: () => {
      for (const query of failed) query.refetch()
    },
  }
}

/** 화면에 보여 줄 오류 문구. 서버 detail을 우선한다 */
export const errorMessageOf = (error: unknown): string | undefined =>
  isApiError(error) ? error.detail : undefined

export const isNotFound = (error: unknown) => isApiError(error) && error.status === 404
