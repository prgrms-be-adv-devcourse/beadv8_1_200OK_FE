import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { type ApiError, isApiError } from '@/shared/api/ApiError'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import {
  ChargeStatus,
  type ChargeStatusResponse,
  type LedgerParams,
  type TermsAgreeRequest,
  type WalletChargeRequest,
  type WalletChargeResponse,
} from '@/shared/api/types'
import { walletBalanceQueryOptions } from '@/shared/api/walletBalance'
import {
  agreeWalletTerms,
  confirmCharge,
  failCharge,
  fetchChargeStatus,
  fetchLedgers,
  fetchWalletTerms,
  requestCharge,
} from './api'

// 지갑 쿼리 키·훅. 키는 [wallet, ...]로 시작한다. 주문을 만든 쪽(checkout)은 접두어 [wallet]로 잔액·내역을 무효화한다.

export const LEDGER_PAGE_SIZE = 20

export const walletKeys = {
  all: [queryKeyPrefix.wallet] as const,
  terms: () => [queryKeyPrefix.wallet, 'terms'] as const,
  // 잔액 키·조회는 shared/api/walletBalance.ts (checkout·me도 씀)
  balance: () => walletBalanceQueryOptions().queryKey,
  ledgers: () => [queryKeyPrefix.wallet, 'ledgers'] as const,
  ledgerList: (params: Omit<LedgerParams, 'page'>) =>
    [queryKeyPrefix.wallet, 'ledgers', params] as const,
  charge: (chargeNo: string) => [queryKeyPrefix.wallet, 'charge', chargeNo] as const,
  chargeConfirm: (chargeNo: string) =>
    [queryKeyPrefix.wallet, 'charge', chargeNo, 'confirm'] as const,
  chargeFail: (chargeNo: string) => [queryKeyPrefix.wallet, 'charge', chargeNo, 'fail'] as const,
}

// ─── 약관 ────────────────────────────────────────────────

export const walletTermsQueryOptions = () =>
  queryOptions({
    queryKey: walletKeys.terms(),
    queryFn: fetchWalletTerms,
    select: (response) => response.terms,
  })

/** 충전 약관(현재 버전 + 동의 여부). 로그인했을 때만 부른다(enabled) */
export function useWalletTerms(enabled = true) {
  return useQuery({ ...walletTermsQueryOptions(), enabled })
}

/** 약관 동의. 성공하거나 409(약관이 바뀜)면 약관을 다시 받는다 → 바뀐 약관으로 다시 동의 시트를 띄울 수 있다 */
export function useAgreeWalletTerms() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError | Error, TermsAgreeRequest>({
    mutationFn: agreeWalletTerms,
    onSettled: (_data, error) => {
      if (!error || (isApiError(error) && error.status === 409)) {
        void queryClient.invalidateQueries({ queryKey: walletKeys.terms() })
      }
    },
  })
}

/** 화면에 보여 줄 약관 오류 문구. 서버 detail을 우선한다 */
export function termsErrorMessage(error: unknown): string {
  return walletErrorMessage(error)
}

// ─── 잔액 ────────────────────────────────────────────────

/** 예치금 잔액·보유 한도. 늘 새로 받는다(staleTime 0) */
export function useWalletBalance(enabled = true) {
  return useQuery({ ...walletBalanceQueryOptions(), enabled })
}

// ─── 충전 ────────────────────────────────────────────────

/** 충전 요청(충전 번호 발급). 409 약관 미동의·한도 초과는 화면이 문구로 알린다 */
export function useRequestCharge() {
  return useMutation<WalletChargeResponse, ApiError | Error, WalletChargeRequest>({
    mutationFn: requestCharge,
  })
}

/**
 * 충전 승인. successUrl로 돌아왔을 때 한 번 부른다. 서버가 멱등이라(같은 건은 승인 한 번, 이후 현재 상태) 쿼리로 둔다:
 * 새로 고쳐도 중복 승인이 아니고, 캐시가 있으면 다시 부르지 않는다. 실패(404·409·422)는 재시도하지 않는다
 */
export function useConfirmCharge(
  chargeNo: string | null,
  paymentKey: string | null,
  amount: number | null,
) {
  const enabled = chargeNo !== null && paymentKey !== null && amount !== null
  return useQuery<ChargeStatusResponse, ApiError | Error>({
    queryKey: walletKeys.chargeConfirm(chargeNo ?? ''),
    queryFn: () =>
      confirmCharge({
        chargeNo: chargeNo ?? '',
        paymentKey: paymentKey ?? '',
        amount: amount ?? 0,
      }),
    enabled,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  })
}

export type ChargeStatusPollOptions = {
  enabled?: boolean
  /** 다시 확인하는 간격(ms) */
  intervalMs?: number
  /** 최대 확인 횟수. 넘으면 ‘확인 중’으로 두고 멈춘다 */
  maxPolls?: number
}

/** 충전 건 상태. 승인 응답이 IN_PROGRESS였을 때 COMPLETED·FAILED로 바뀔 때까지 몇 번 다시 확인한다 */
export function useChargeStatus(
  chargeNo: string | null,
  { enabled = true, intervalMs = 2000, maxPolls = 15 }: ChargeStatusPollOptions = {},
) {
  return useQuery<ChargeStatusResponse, ApiError | Error>({
    queryKey: walletKeys.charge(chargeNo ?? ''),
    queryFn: () => fetchChargeStatus(chargeNo ?? ''),
    enabled: enabled && chargeNo !== null,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (query) =>
      query.state.data?.status === ChargeStatus.IN_PROGRESS &&
      query.state.dataUpdateCount < maxPolls
        ? intervalMs
        : false,
  })
}

/** 결제 실패 처리. failUrl로 돌아왔을 때 한 번 부른다(멱등 → 쿼리). 실패해도 화면은 그린다 */
export function useFailCharge(
  chargeNo: string | null,
  code: string | null,
  message: string | null,
) {
  return useQuery<ChargeStatusResponse, ApiError | Error>({
    queryKey: walletKeys.chargeFail(chargeNo ?? ''),
    queryFn: () =>
      failCharge({
        chargeNo: chargeNo ?? '',
        code: code ?? 'UNKNOWN',
        ...(message ? { message } : {}),
      }),
    enabled: chargeNo !== null,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  })
}

// ─── 이용 내역 ───────────────────────────────────────────

export const ledgersQueryOptions = (params: Omit<LedgerParams, 'page' | 'size'>) =>
  infiniteQueryOptions({
    queryKey: walletKeys.ledgerList({ ...params, size: LEDGER_PAGE_SIZE }),
    queryFn: ({ pageParam }) =>
      fetchLedgers({ ...params, page: pageParam, size: LEDGER_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    staleTime: 0,
  })

/** 이용 내역(기간·유형). ‘더 보기’로 다음 페이지를 이어 받는다 */
export function useLedgers(params: Omit<LedgerParams, 'page' | 'size'>, enabled = true) {
  return useInfiniteQuery({ ...ledgersQueryOptions(params), enabled })
}

/** 화면에 보여 줄 지갑 오류 문구. 422는 칸별 문구가 더 구체적이라 그것을, 아니면 detail */
export function walletErrorMessage(error: unknown): string {
  return isApiError(error)
    ? (error.errors[0]?.detail ?? error.detail)
    : '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'
}
