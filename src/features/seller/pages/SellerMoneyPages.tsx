import { useNavigate, useParams, useSearchParams } from 'react-router'
import { sellerWallet } from '../fixtures'
import {
  useMonthPayouts,
  usePayout,
  usePayoutItems,
  usePayoutOutlook,
  usePayouts,
  useSellerBalance,
} from '../queries'
import { SellerPayoutsView } from '../views/SellerPayoutsView'
import { SellerWalletView } from '../views/SellerWalletView'

// S-08 정산 내역 · 지갑·출금 라우트 (판매자 센터 청크).
// 정산: ✅ GET /payouts/me?from&to(최근 1년, 서버 최대 범위), /payouts/me/{id}, /payouts/me/{id}/items,
//   정산 예정 금액 = GET /payouts/me/candidates?unsettledOnly=true 합계(최대 100건), 다음 정산일은 정책 상수.
// 지갑: ✅ 잔액 GET /wallets/sellers/me/balance. TODO(api): ❌ 출금·입출금 내역·계좌 변경 → 출금 신청은 닫아 두고 내역은 비운다.

/** /seller/payouts?page= 와 /seller/payouts/:payoutId 가 같이 쓴다. 상세는 목록 위 모달 */
export function SellerPayoutsPage() {
  const { payoutId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const list = usePayouts(page - 1)
  const month = useMonthPayouts()
  // 후보 조회가 실패해도 목록은 보여 준다(요약 칸만 비움)
  const outlook = usePayoutOutlook()
  const openId = payoutId === undefined ? null : Number(payoutId)
  const validId = openId !== null && Number.isInteger(openId) ? openId : null
  const detail = usePayout(validId)
  const items = usePayoutItems(validId)
  const search = params.toString()

  // 403(내 정산이 아님)·404는 같은 ‘찾을 수 없어요’로
  const detailStatus =
    validId === null || detail.error?.status === 403 || detail.error?.status === 404
      ? 'notFound'
      : detail.isError || items.isError
        ? 'error'
        : detail.isPending || items.isPending
          ? 'pending'
          : 'success'

  return (
    <SellerPayoutsView
      status={list.isError || month.isError ? 'error' : list.isPending ? 'pending' : 'success'}
      payouts={list.data?.content ?? []}
      outlook={outlook.data ?? null}
      monthSummary={month.data ?? { month: new Date().toISOString(), amount: 0, count: 0 }}
      page={page}
      totalPages={list.data?.totalPages ?? 1}
      onPageChange={(next) => setParams(next === 1 ? {} : { page: String(next) })}
      onRetry={() => {
        void list.refetch()
        void month.refetch()
        void outlook.refetch()
      }}
      errorMessage={(list.error ?? month.error)?.detail}
      detail={
        openId === null
          ? null
          : {
              onClose: () => navigate({ pathname: '/seller/payouts', search }),
              status: detailStatus,
              payout: detail.data ?? null,
              items: items.data?.pages.flatMap((p) => p.content) ?? [],
              hasMoreItems: items.hasNextPage,
              loadingMoreItems: items.isFetchingNextPage,
              onLoadMoreItems: () => void items.fetchNextPage(),
              onRetry: () => {
                void detail.refetch()
                void items.refetch()
              },
            }
      }
    />
  )
}

export function SellerWalletPage() {
  const balance = useSellerBalance()
  const amount = balance.data?.balance ?? 0

  return (
    <SellerWalletView
      status={balance.isError ? 'error' : balance.isPending ? 'pending' : 'success'}
      wallet={{
        ...sellerWallet,
        balance: amount,
        withdrawableAmount: amount,
        accountNeedsCheck: false,
        accountChangePending: false,
      }}
      withdrawals={[]}
      transactions={[]}
      featureDisabledReason="출금 신청은 아직 열리지 않았어요"
      onWithdraw={() => {}}
      onRequestAccountChange={() => {}}
      errorMessage={balance.error?.detail}
      onRetry={() => void balance.refetch()}
    />
  )
}
