import { TermsType } from '@/shared/api/types'
import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { BALANCE_DEFAULT, BALANCE_SHORT, walletTerms, walletTransactions } from './fixtures'
import { WalletTxType } from './types'
import { ChargeResultView } from './views/ChargeResultView'
import { ChargeView, type ChargeViewProps } from './views/ChargeView'
import { TermsView, type TermsViewProps } from './views/TermsView'
import { WalletHistoryView, type WalletHistoryViewProps } from './views/WalletHistoryView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다)

const terms = (props: Partial<TermsViewProps> = {}) => (
  <TermsView
    status="success"
    terms={walletTerms}
    selectedType={TermsType.ELECTRONIC_FINANCIAL_TRANSACTION}
    onRetry={() => {}}
    onBack={() => {}}
    {...props}
  />
)

const agreedTerms = walletTerms.map((item) => ({ ...item, agreed: true }))

const charge = (props: Partial<ChargeViewProps> = {}) => (
  <ChargeView balance={BALANCE_DEFAULT} terms={agreedTerms} onCharge={() => {}} {...props} />
)

const fromOrder = { balance: BALANCE_SHORT, shortfall: 7800, returnTo: '/checkout' }

export const chargePreviews: ScreenPreview[] = [
  {
    id: 'charge',
    title: 'B-05 예치금 충전',
    layout: 'public',
    path: '/wallet/charge',
    states: [
      { id: 'my', label: '마이페이지에서', render: () => charge() },
      { id: 'from-order', label: '주문서에서 (부족 금액)', render: () => charge(fromOrder) },
      {
        id: 'amount',
        label: '금액 입력',
        render: () => charge({ defaultAmount: 70000 }),
      },
      {
        id: 'too-small',
        label: '최소 금액 미만',
        render: () => charge({ defaultAmount: 15000 }),
      },
      {
        id: 'over-limit',
        label: '보유 한도 초과',
        render: () => charge({ balance: 1950000, defaultAmount: 100000 }),
      },
      {
        id: 'first-terms',
        label: '첫 충전 약관 시트',
        render: () => charge({ ...fromOrder, terms: walletTerms, defaultTermsOpen: true }),
      },
      {
        id: 'paying',
        label: '결제창 진행',
        render: () => <ChargeResultView status="paying" amount={20000} />,
      },
      {
        id: 'success-order',
        label: '성공 (주문서로)',
        render: () => (
          <ChargeResultView
            status="success"
            amount={20000}
            balanceAfter={BALANCE_SHORT + 20000}
            returnTo="/checkout"
          />
        ),
      },
      {
        id: 'success-my',
        label: '성공 (마이에서)',
        render: () => (
          <ChargeResultView
            status="success"
            amount={50000}
            balanceAfter={BALANCE_DEFAULT + 50000}
          />
        ),
      },
      {
        id: 'failed',
        label: '실패',
        render: () => <ChargeResultView status="failed" returnTo="/checkout" />,
      },
      {
        id: 'pending',
        label: '확인 중',
        render: () => <ChargeResultView status="pending" amount={20000} returnTo="/checkout" />,
      },
      { id: 'expired', label: '시간 만료', render: () => <ChargeResultView status="expired" /> },
    ],
  },
]

export const walletPreviews: ScreenPreview[] = [
  {
    id: 'terms',
    title: '약관 보기',
    layout: 'public',
    path: '/terms/ELECTRONIC_FINANCIAL_TRANSACTION',
    states: [
      { id: 'efin', label: '전자금융거래', render: () => terms() },
      {
        id: 'prepaid',
        label: '선불전자지급수단',
        render: () => terms({ selectedType: TermsType.PREPAID_PAYMENT_INSTRUMENT }),
      },
      {
        id: 'privacy',
        label: '개인정보',
        render: () => terms({ selectedType: TermsType.PERSONAL_INFORMATION_COLLECTION }),
      },
      { id: 'loading', label: '로딩', render: () => terms({ status: 'pending', terms: [] }) },
      { id: 'error', label: '불러오기 실패', render: () => terms({ status: 'error', terms: [] }) },
    ],
  },
]

const history = (props: Partial<WalletHistoryViewProps> = {}) => (
  <WalletHistoryView
    status="success"
    balance={BALANCE_DEFAULT}
    transactions={walletTransactions.slice(0, 8)}
    period="1m"
    onPeriodChange={() => {}}
    range={[null, null]}
    onRangeChange={() => {}}
    type="ALL"
    onTypeChange={() => {}}
    {...props}
  />
)

export const walletHistoryPreviews: ScreenPreview[] = [
  {
    id: 'wallet-history',
    title: 'B-13 지갑 이용 내역',
    layout: 'mypage',
    path: '/me/wallet',
    tabBar: true,
    states: [
      { id: 'default', label: '1개월 · 전체', render: () => history() },
      {
        id: 'charge',
        label: '유형: 충전',
        render: () =>
          history({
            type: WalletTxType.CHARGE,
            transactions: walletTransactions.filter((tx) => tx.type === WalletTxType.CHARGE),
          }),
      },
      {
        id: 'custom',
        label: '직접 선택',
        render: () =>
          history({
            period: 'custom',
            range: [new Date('2026-08-01T00:00:00'), new Date('2026-10-18T00:00:00')],
            transactions: walletTransactions,
          }),
      },
      {
        id: 'range-error',
        label: '날짜 순서 오류',
        render: () =>
          history({
            period: 'custom',
            range: [new Date('2026-10-18T00:00:00'), new Date('2026-10-01T00:00:00')],
          }),
      },
      { id: 'empty', label: '빈 상태', render: () => history({ transactions: [] }) },
      {
        id: 'more',
        label: '더 보기',
        render: () => history({ hasMore: true, onLoadMore: () => {} }),
      },
      { id: 'loading', label: '로딩', render: () => history({ status: 'pending' }) },
    ],
  },
]
