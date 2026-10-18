import { type TermsItem, TermsType } from '@/shared/api/types'
import { type WalletTransaction, WalletTxType } from './types'

// 1단계 샘플 데이터. 약관 본문은 법무 검토 전이라 조항 제목만 둔다(시안도 자리 표시).

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

// 예치금 잔액. checkout/fixtures.ts와 같은 흐름: 잔액 32,000 → 주문 39,800에 7,800 부족 → 20,000 충전 → 52,000
export const BALANCE_SHORT = 32000
export const BALANCE_DEFAULT = 128000

// ─── 이용 내역 (최신 순) ─────────────────────────────────
// 마지막 잔액 128,000원 = BALANCE_DEFAULT. 주문 금액·번호는 orders/fixtures.ts, 문의 환불은 고객센터 답변(CS-20261008-0017)과 같다.

export const walletTransactions: WalletTransaction[] = [
  tx(10, WalletTxType.PAYMENT, '주문 20261018-0184 결제', -39800, 128000, '2026-10-18T14:30:00'),
  tx(9, WalletTxType.PAYMENT, '주문 20261015-0151 결제', -13900, 167800, '2026-10-15T09:12:00'),
  tx(
    8,
    WalletTxType.PAYMENT_CANCEL,
    '주문 20261014-0140 결제 취소',
    9900,
    181700,
    '2026-10-14T21:30:00',
  ),
  tx(7, WalletTxType.PAYMENT, '주문 20261014-0140 결제', -9900, 171800, '2026-10-14T20:05:00'),
  tx(6, WalletTxType.PAYMENT, '주문 20261012-0093 결제', -23900, 181700, '2026-10-12T11:40:00'),
  tx(5, WalletTxType.CHARGE, '토스페이먼츠 카드 충전', 200000, 205600, '2026-10-12T11:30:00'),
  tx(4, WalletTxType.REFUND, '문의 CS-20261008-0017 환불', 2200, 5600, '2026-10-09T14:10:00'),
  tx(3, WalletTxType.PAYMENT, '주문 20261006-0027 결제', -29900, 3400, '2026-10-06T08:20:00'),
  tx(2, WalletTxType.CHARGE, '토스페이먼츠 간편결제 충전', 30000, 33300, '2026-10-01T10:00:00'),
  tx(1, WalletTxType.PAYMENT, '주문 20260820-0066 결제', -16700, 3300, '2026-08-20T19:12:00'),
  tx(0, WalletTxType.CHARGE, '토스페이먼츠 카드 충전', 20000, 20000, '2026-08-20T19:05:00'),
]

function tx(
  transactionId: number,
  type: WalletTxType,
  description: string,
  amount: number,
  balanceAfter: number,
  occurredAt: string,
): WalletTransaction {
  return { transactionId, type, description, amount, balanceAfter, occurredAt }
}
