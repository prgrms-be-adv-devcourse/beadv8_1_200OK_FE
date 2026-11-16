import {
  type QueryClient,
  queryOptions,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { type ApiError, isApiError } from '@/shared/api/ApiError'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import { productDetailQueryOptions } from '@/shared/api/productDetail'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import type { Cart, CartItem, ProductDetail } from '@/shared/api/types'
import { MAX_CART_QUANTITY } from '@/shared/lib/constants'
import { showToast } from '@/shared/ui'
import {
  type AddCartItemResult,
  addCartItem,
  changeAllCartSelection,
  changeCartQuantity,
  changeCartSelection,
  deleteCartItem,
  deleteSelectedCartItems,
  fetchCart,
} from './api'
import { type DetailResult, toCartGroups } from './cartLines'
import { productIdOfOption, rememberOptionProduct } from './optionProducts'
import type { CartGroup } from './types'

// 장바구니 쿼리 키·훅. 키는 [cart, ...]로 시작한다. 장바구니가 바뀌면 주문서([checkout])도 다시 받는다.
// 수량·선택·삭제는 낙관적으로 바로 그리고, 실패하면 되돌린 뒤 서버 문구를 토스트로 알린다.

export const cartKeys = {
  all: [queryKeyPrefix.cart] as const,
  mine: () => [queryKeyPrefix.cart, 'me'] as const,
}

export const cartQueryOptions = () =>
  queryOptions({ queryKey: cartKeys.mine(), queryFn: fetchCart, staleTime: 0 })

const useAuthSession = () => useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)

/** 헤더 장바구니 개수(담긴 줄 수). 로그인하지 않았으면 부르지 않고 undefined */
export function useCartCount(): number | undefined {
  const auth = useAuthSession()
  const { data } = useQuery({
    ...cartQueryOptions(),
    enabled: auth !== null,
    select: (cart) => cart.items.length,
  })
  return auth ? data : undefined
}

// 상품 상세를 이미 본 옵션이면 캐시에서 상품을 찾는다(products 상세 키: [products, 'detail', id])
function productIdInCache(queryClient: QueryClient, optionId: number): number | null {
  const cached = queryClient.getQueriesData<ProductDetail>({
    queryKey: [queryKeyPrefix.products, 'detail'],
  })
  for (const [, detail] of cached) {
    if (detail?.options.some((option) => option.optionId === optionId)) return detail.productId
  }
  return null
}

export type CartStatus = 'pending' | 'error' | 'success'

/** 장바구니 화면 줄. 옵션별 상품 상세(useQueries, 상품 캐시 공유)로 이름·가격·구매 가능 여부를 붙인다 */
export function useCartGroups(): {
  status: CartStatus
  groups: CartGroup[]
  error: unknown
  refetch: () => void
} {
  const queryClient = useQueryClient()
  const cart = useQuery(cartQueryOptions())
  const items = cart.data?.items ?? []
  const productIdOf = (optionId: number) =>
    productIdOfOption(optionId) ?? productIdInCache(queryClient, optionId)
  const productIds = [
    ...new Set(
      items.flatMap((item) => {
        const productId = productIdOf(item.productOptionId)
        return productId === null ? [] : [productId]
      }),
    ),
  ]
  const details = useQueries({ queries: productIds.map((id) => productDetailQueryOptions(id)) })
  const detailById = new Map<number, DetailResult>(
    productIds.map((id, i) => [id, { data: details[i]?.data, error: details[i]?.error }]),
  )

  const status: CartStatus = cart.isPending
    ? 'pending'
    : cart.isError && !cart.data
      ? 'error'
      : details.some((detail) => detail.isPending)
        ? 'pending'
        : 'success'

  return {
    status,
    groups: cart.data ? toCartGroups(items, productIdOf, (id) => detailById.get(id)) : [],
    error: cart.error,
    refetch: () => {
      void cart.refetch()
      for (const detail of details) if (detail.isError) void detail.refetch()
    },
  }
}

/** 화면에 보여 줄 장바구니 오류 문구. 422는 칸별 문구(수량은 1 이상…)를 먼저 쓴다 */
export function cartErrorMessage(error: unknown): string {
  if (!isApiError(error)) return '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'
  return error.errors[0]?.detail ?? error.detail
}

function invalidateCart(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: cartKeys.all })
  void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.checkout] })
}

function useCartMutation<TVariables>({
  mutationFn,
  optimistic,
  successMessage,
}: {
  mutationFn: (variables: TVariables) => Promise<unknown>
  optimistic?: (cart: Cart, variables: TVariables) => Cart
  successMessage?: string
}) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError | Error, TVariables, { previous?: Cart }>({
    mutationKey: cartKeys.all,
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.mine() })
      const previous = queryClient.getQueryData<Cart>(cartKeys.mine())
      if (previous && optimistic) {
        queryClient.setQueryData(cartKeys.mine(), optimistic(previous, variables))
      }
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(cartKeys.mine(), context.previous)
      showToast({ message: cartErrorMessage(error) })
    },
    onSuccess: () => {
      if (successMessage) showToast({ message: successMessage })
    },
    onSettled: () => {
      // 수량을 연달아 바꾸면 마지막 변경이 끝난 뒤에 한 번만 다시 받는다(중간 응답이 화면을 되돌리지 않게)
      if (queryClient.isMutating({ mutationKey: cartKeys.all }) === 1) invalidateCart(queryClient)
    },
  })
}

const mapItems = (cart: Cart, fn: (item: CartItem) => CartItem | null): Cart => ({
  ...cart,
  items: cart.items.flatMap((item) => {
    const next = fn(item)
    return next ? [next] : []
  }),
})

export function useChangeCartQuantity() {
  return useCartMutation<{ cartItemId: number; quantity: number }>({
    mutationFn: ({ cartItemId, quantity }) => changeCartQuantity(cartItemId, quantity),
    optimistic: (cart, { cartItemId, quantity }) =>
      mapItems(cart, (item) => (item.cartItemId === cartItemId ? { ...item, quantity } : item)),
  })
}

export function useChangeCartSelection() {
  return useCartMutation<{ cartItemId: number; selected: boolean }>({
    mutationFn: ({ cartItemId, selected }) => changeCartSelection(cartItemId, selected),
    optimistic: (cart, { cartItemId, selected }) =>
      mapItems(cart, (item) => (item.cartItemId === cartItemId ? { ...item, selected } : item)),
  })
}

export function useChangeAllCartSelection() {
  return useCartMutation<boolean>({
    mutationFn: changeAllCartSelection,
    optimistic: (cart, selected) => mapItems(cart, (item) => ({ ...item, selected })),
  })
}

/** 한 개 또는 여러 개(구매할 수 없는 상품 빼기) 삭제. 여러 개를 한 번에 지우는 API는 선택 삭제뿐이다 */
export function useDeleteCartItems(successMessage: string) {
  return useCartMutation<number[]>({
    mutationFn: (cartItemIds) => Promise.all(cartItemIds.map(deleteCartItem)),
    optimistic: (cart, cartItemIds) =>
      mapItems(cart, (item) => (cartItemIds.includes(item.cartItemId) ? null : item)),
    successMessage,
  })
}

export function useDeleteSelectedCartItems() {
  return useCartMutation<void>({
    mutationFn: deleteSelectedCartItems,
    optimistic: (cart) => mapItems(cart, (item) => (item.selected ? null : item)),
    successMessage: '선택한 상품을 뺐어요',
  })
}

/** 주문서로 가기 전에 보내는 중인 선택·수량 변경을 기다린다(주문서는 서버의 선택 상태로 만든다) */
export function useSettleCart() {
  const queryClient = useQueryClient()
  return () =>
    new Promise<void>((resolve) => {
      const done = () => queryClient.isMutating({ mutationKey: cartKeys.all }) === 0
      if (done()) return resolve()
      const unsubscribe = queryClient.getMutationCache().subscribe(() => {
        if (!done()) return
        unsubscribe()
        resolve()
      })
    })
}

export type AddToCartRequest = { productId: number; optionId: number; quantity: number }

/**
 * 상품 상세의 ‘장바구니 담기’(products → cart 공개 hook). 로그인 확인은 부르는 쪽이 한다(LoginRequiredModal).
 * 이미 담긴 옵션이면 서버가 수량을 더해 200을 준다(SCREENS ‘중복 담기 안내’, 최대 MAX_CART_QUANTITY).
 * 결과·실패는 토스트로 알린다(실패는 서버 detail).
 */
export function useAddToCart() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const mutation = useMutation<AddCartItemResult, ApiError | Error, AddToCartRequest>({
    mutationKey: cartKeys.all,
    mutationFn: ({ productId, optionId, quantity }) => {
      rememberOptionProduct(optionId, productId)
      return addCartItem({ productOptionId: optionId, quantity })
    },
    onSuccess: ({ merged, quantity }) => {
      showToast({
        message: !merged
          ? '장바구니에 담았어요'
          : quantity >= MAX_CART_QUANTITY
            ? `이미 담긴 상품이라 최대 수량(${MAX_CART_QUANTITY}개)까지 담았어요`
            : `이미 담긴 상품이라 수량을 더했어요. 지금 ${quantity}개 담겨 있어요`,
        action: { label: '장바구니 보기', onClick: () => navigate('/cart') },
      })
    },
    onError: (error) => showToast({ message: cartErrorMessage(error) }),
    onSettled: () => invalidateCart(queryClient),
  })

  return { addToCart: mutation.mutate, adding: mutation.isPending }
}
