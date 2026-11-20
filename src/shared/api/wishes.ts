import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useSyncExternalStore } from 'react'
import type { ApiError } from './ApiError'
import { getAuthSession, subscribeAuth } from './authToken'
import { apiClient } from './client'
import { queryKeyPrefix } from './queryKeys'
import { MemberRole, type WishPage } from './types'

// 관심 상품(찜). products(카드 하트·상세 관심 버튼)와 me(관심 상품 화면·마이페이지 개수)가 함께 써서 shared에 둔다(ADR-0003).
// 권한은 토큰의 BUYER다. 승인된 판매자도 BUYER를 함께 받아 찜할 수 있고, 관리자(ADMIN 단독)는 403, 비로그인은 401이다.
// → 찜 목록은 로그인한 구매자·판매자일 때만 부른다.
//
// 찜 여부: 상품 상세·목록 응답에 찜 여부 칸이 없다. 그래서 찜 ID를 목록 API(size 50)로 끝까지 모아 캐시하고,
// 카드·상세는 그 집합으로 하트를 그린다. 등록·해제는 그 집합을 먼저 바꾸고(낙관적) 실패하면 되돌린다.
// TODO(api): 상세·목록 응답에 찜 여부 칸(또는 상품 ID 여러 개의 찜 여부를 한 번에 확인하는 API)이 생기면
//   ID 모으기(fetchAllWishedIds)를 걷어내고 그 칸을 쓴다. 찜이 아주 많으면 지금은 첫 화면에 요청이 여러 번 나간다.

/** 목록 API의 최대 페이지 크기 (서버 1~50) */
export const WISH_PAGE_MAX_SIZE = 50
/** 목록 API의 최대 페이지 번호 (서버 0~10000) */
const WISH_PAGE_MAX_INDEX = 10_000

// ✅ PUT /api/v1/members/me/wishes/{productId} → 204. 여러 번 보내도 같다. 해제했던 상품은 지금 시각으로 다시 찜해 목록 맨 앞에 온다.
// 상품이 있는지는 서버가 보지 않는다
export async function addWish(productId: number): Promise<void> {
  await apiClient.put(`/api/v1/members/me/wishes/${productId}`)
}

// ✅ DELETE /api/v1/members/me/wishes/{productId} → 204. 찜하지 않은 상품도 204
export async function removeWish(productId: number): Promise<void> {
  await apiClient.delete(`/api/v1/members/me/wishes/${productId}`)
}

// ✅ GET /api/v1/members/me/wishes?page&size → 최근 찜 순. size 1~50(기본 20), page 0~10000, 범위 밖이면 422
export async function fetchWishPage(params: { page: number; size: number }): Promise<WishPage> {
  const { data } = await apiClient.get<WishPage>('/api/v1/members/me/wishes', { params })
  return data
}

/** 찜한 상품 ID 전부(최근 찜 순). 마지막 페이지까지 size 50으로 차례로 부른다 */
export async function fetchAllWishedIds(): Promise<number[]> {
  const ids: number[] = []
  const seen = new Set<number>()
  for (let page = 0; page <= WISH_PAGE_MAX_INDEX; page++) {
    const { content, totalPages } = await fetchWishPage({ page, size: WISH_PAGE_MAX_SIZE })
    // 모으는 사이에 찜이 바뀌면 같은 ID가 다음 페이지에 또 올 수 있다
    for (const { productId } of content) {
      if (seen.has(productId)) continue
      seen.add(productId)
      ids.push(productId)
    }
    if (content.length < WISH_PAGE_MAX_SIZE || page + 1 >= totalPages) break
  }
  return ids
}

export const wishKeys = {
  /** 찜 ID 전부. 회원마다 따로 둬서 다른 계정으로 로그인하면 새로 모은다 */
  ids: (memberId: number) => [queryKeyPrefix.wishes, 'ids', memberId] as const,
  /** 관심 상품 화면·마이페이지 개수가 쓰는 목록 페이지 전부 (무효화용) */
  pages: () => [queryKeyPrefix.wishes, 'page'] as const,
  page: (memberId: number, page: number, size: number) =>
    [queryKeyPrefix.wishes, 'page', memberId, page, size] as const,
}

export const wishedIdsQueryOptions = (memberId: number) =>
  queryOptions({
    queryKey: wishKeys.ids(memberId),
    queryFn: fetchAllWishedIds,
    // 바꿀 때마다 캐시를 직접 고치므로 자주 다시 모으지 않는다(다른 탭·기기에서 바꾼 것은 이때 반영)
    staleTime: 5 * 60_000,
  })

export const wishPageQueryOptions = (memberId: number, page: number, size: number) =>
  queryOptions({
    queryKey: wishKeys.page(memberId, page, size),
    queryFn: () => fetchWishPage({ page, size }),
    staleTime: 30_000,
  })

/** 찜을 쓸 수 있는가. guest = 로그인 필요, admin = 관리자 계정이라 못 씀(403), buyer = 구매자·판매자 */
export type WishAccess = 'guest' | 'admin' | 'buyer'

export const WISH_ADMIN_REASON = '관리자 계정은 관심 상품을 쓸 수 없어요'

/** 지금 로그인 상태의 찜 권한과 회원 번호 */
export function useWishAccess(): { access: WishAccess; memberId?: number } {
  const auth = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)
  if (!auth) return { access: 'guest' }
  return { access: auth.role === MemberRole.ADMIN ? 'admin' : 'buyer', memberId: auth.memberId }
}

/**
 * 내가 찜한 상품 ID 집합. 구매자·판매자일 때만 부른다.
 * wishedIds가 undefined면 아직 모르는 것(불러오는 중·실패·비로그인·관리자)이다.
 */
export function useWishedIds() {
  const { access, memberId } = useWishAccess()
  const enabled = access === 'buyer' && memberId !== undefined
  const query = useQuery({ ...wishedIdsQueryOptions(memberId ?? 0), enabled })
  const wishedIds = useMemo(() => (query.data ? new Set(query.data) : undefined), [query.data])
  return { access, memberId, wishedIds, query }
}

type WishVariables = { productId: number; wish: boolean }
type WishContext = { memberId?: number; optimistic: boolean }

const applyWish = (ids: number[], productId: number, wish: boolean) => {
  const rest = ids.filter((id) => id !== productId)
  return wish ? [productId, ...rest] : rest
}

/**
 * 찜 등록(wish: true)·해제(false). 찜 ID 집합을 먼저 바꾸고, 실패하면 그 상품만 되돌린다.
 * 연타해도 서버에 순서대로 닿도록 찜 요청은 하나씩 보낸다(scope). 성공하면 목록 페이지(관심 상품 화면·개수)를 다시 부른다.
 */
export function useWishMutation() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError | Error, WishVariables, WishContext>({
    scope: { id: 'wishes' },
    mutationFn: ({ productId, wish }) => (wish ? addWish(productId) : removeWish(productId)),
    onMutate: async ({ productId, wish }) => {
      const memberId = getAuthSession()?.memberId
      if (memberId === undefined) return { optimistic: false }
      const key = wishKeys.ids(memberId)
      // 아직 모으는 중이면 취소하지 않는다(취소하면 다시 모으지 않아 하트가 비어 남는다). 끝나면 다시 모은다
      if (queryClient.getQueryData(key) === undefined) return { memberId, optimistic: false }
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<number[]>(key, (ids) => ids && applyWish(ids, productId, wish))
      return { memberId, optimistic: true }
    },
    // 집합 전체를 되돌리면 그사이 누른 다른 하트까지 되돌아가므로 이 상품만 반대로 돌린다
    onError: (_error, { productId, wish }, context) => {
      if (!context?.optimistic || context.memberId === undefined) return
      queryClient.setQueryData<number[]>(
        wishKeys.ids(context.memberId),
        (ids) => ids && applyWish(ids, productId, !wish),
      )
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context && !context.optimistic && context.memberId !== undefined) {
        void queryClient.invalidateQueries({ queryKey: wishKeys.ids(context.memberId) })
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wishKeys.pages() }),
  })
}
