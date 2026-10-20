import { type LedgerEntry, LedgerType, type TermsItem, TermsType } from '@/shared/api/types'
import { toWalletTransaction } from './ledger'

// 샘플 데이터. 약관 본문은 법무 검토 전이라 조항 제목만 둔다(시안도 자리 표시).

const body = (clauses: string[]) =>
  clauses.map((title) => `${title}\n약관 본문은 법무 검토 후 들어가요.`).join('\n\n')

export const walletTerms: TermsItem[] = [
  {
    type: TermsType.ELECTRONIC_FINANCIAL_TRANSACTION,
    version: 1,
    title: '전자금융거래 이용약관',
    content: body([
      '제1조 (목적)',
      '제2조 (용어의 정의)',
      '제3조 (약관의 명시와 변경)',
      '제4조 (거래내용의 확인)',
      '제5조 (오류의 정정)',
      '제6조 (분쟁처리 및 분쟁조정)',
    ]),
    required: true,
    agreed: false,
  },
  {
    type: TermsType.PREPAID_PAYMENT_INSTRUMENT,
    version: 1,
    title: '선불전자지급수단 이용약관',
    content: body([
      '제1조 (목적)',
      '제2조 (용어의 정의)',
      '제3조 (예치금의 충전)',
      '제4조 (예치금의 사용)',
      '제5조 (예치금의 환급)',
      '제6조 (약관의 변경)',
    ]),
    required: true,
    agreed: false,
  },
  {
    type: TermsType.PERSONAL_INFORMATION_COLLECTION,
    version: 1,
    title: '개인정보 수집 및 이용 동의',
    content: body([
      '1. 수집하는 개인정보 항목',
      '2. 수집·이용 목적',
      '3. 보유 및 이용 기간',
      '4. 동의를 거부할 권리와 불이익',
    ]),
    required: true,
    agreed: true,
  },
]

// 예치금 잔액(GET /wallets/me/balance 모양). checkout/fixtures.ts와 같은 흐름: 잔액 32,000 → 주문 39,800에 7,800 부족 → 10,000 충전 → 42,000
export const BALANCE_SHORT = 32000
export const BALANCE_DEFAULT = 128000
/** 잔액 보유 한도(서버 maxBalance, 2026-10-20 로컬 서버 500,000원) */
export const MAX_BALANCE = 500_000
export const walletBalance = { balance: BALANCE_DEFAULT, maxBalance: MAX_BALANCE }

// ─── 이용 내역 (최신 순, GET /wallets/me/ledgers 모양) ────────────────────
// 마지막 잔액 128,000원 = BALANCE_DEFAULT. 주문 번호·금액은 orders/fixtures.ts와 같다.

const ledger = (
  occurredAt: string,
  type: LedgerType,
  amount: number,
  balanceAfter: number,
  orderId: number | null = null,
): LedgerEntry => ({ occurredAt, type, orderId, amount, balanceAfter })

export const walletLedgers: LedgerEntry[] = [
  ledger('2026-10-18T14:30:00', LedgerType.PAYMENT, 39800, 128000, 184),
  ledger('2026-10-15T09:12:00', LedgerType.PAYMENT, 13900, 167800, 151),
  ledger('2026-10-14T20:05:00', LedgerType.PAYMENT, 9900, 181700, 140),
  ledger('2026-10-12T11:40:00', LedgerType.PAYMENT, 23900, 191600, 93),
  ledger('2026-10-12T11:30:00', LedgerType.CHARGE, 200000, 215500),
  ledger('2026-10-06T08:20:00', LedgerType.PAYMENT, 29900, 15500, 27),
  ledger('2026-10-01T10:00:00', LedgerType.CHARGE, 30000, 45400),
  ledger('2026-08-20T19:12:00', LedgerType.PAYMENT, 14600, 15400, 66),
  ledger('2026-08-20T19:05:00', LedgerType.CHARGE, 30000, 30000),
]

export const walletTransactions = walletLedgers.map((entry, index) =>
  toWalletTransaction(entry, `0-${index}`),
)

/** 충전 번호 샘플 (토스 orderId) */
export const SAMPLE_CHARGE_NO = 'CHG-TEST-1'
