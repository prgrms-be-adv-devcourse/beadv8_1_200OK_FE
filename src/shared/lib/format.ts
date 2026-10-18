import 'dayjs/locale/ko'

import dayjs from 'dayjs'

// 숫자·날짜 표기 (design/tokens.md 2장 '숫자 표기')

/** 차감 표기에 쓰는 유니코드 마이너스(U+2212). 하이픈(-)이 아니다. */
export const MINUS = '−'

const amountFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 })

/** 금액 숫자 부분만: `23,900`, 음수는 `−717`. ‘원’을 따로 그리는 PriceText용 */
export function formatAmount(amount: number): string {
  const digits = amountFormatter.format(Math.abs(amount))
  return amount < 0 && digits !== '0' ? `${MINUS}${digits}` : digits
}

/** 늘고 준 금액(조정 등): `+3,000`, `−10,000`, 0은 `0` */
export function formatSignedAmount(amount: number): string {
  return amount > 0 ? `+${formatAmount(amount)}` : formatAmount(amount)
}

/**
 * 금액 문자열: `23,900원`, 음수는 `−717원`.
 * `deduct`면 부호와 상관없이 차감으로 표기한다: `formatPrice(717, { deduct: true })` → `−717원`
 */
export function formatPrice(amount: number, { deduct = false }: { deduct?: boolean } = {}): string {
  const value = deduct ? -Math.abs(amount) : amount
  return `${formatAmount(value)}원`
}

export type DateStyle = 'date' | 'short' | 'dateTime' | 'monthDay' | 'monthDayWeek' | 'month'

const dateFormats: Record<DateStyle, string> = {
  date: 'YYYY.MM.DD(ddd)', // 상세 2026.10.08(목)
  short: 'MM.DD', // 목록 10.08
  dateTime: 'M월 D일 HH:mm', // 일시 10월 13일 14:30
  monthDay: 'M월 D일', // 안내 문장 10월 16일
  monthDayWeek: 'M월 D일(ddd)', // 예정일 10월 16일(금)
  month: 'M월', // 월 합계 10월
}

/**
 * 날짜 표기. 서버 시각은 시간대 없는 한국 시간(`2026-10-15T03:00:00`)이라 그대로 읽는다.
 * 읽을 수 없는 값이면 빈 문자열을 돌려준다.
 */
export function formatDate(value: string | Date, style: DateStyle = 'date'): string {
  const date = dayjs(value)
  if (!date.isValid()) return ''
  return date.locale('ko').format(dateFormats[style])
}

/**
 * 수량 표기: `1개`, 옵션명이 있으면 `3kg × 1`
 */
export function formatQuantity(quantity: number, optionName?: string): string {
  const count = amountFormatter.format(quantity)
  return optionName ? `${optionName} × ${count}` : `${count}개`
}
