import {
  formatAmount,
  formatDate,
  formatPrice,
  formatQuantity,
  formatSignedAmount,
  MINUS,
} from './format'

describe('formatAmount', () => {
  it('세 자리마다 쉼표를 넣는다', () => {
    expect(formatAmount(23900)).toBe('23,900')
    expect(formatAmount(1234567)).toBe('1,234,567')
    expect(formatAmount(0)).toBe('0')
  })

  it('음수는 유니코드 마이너스를 쓴다', () => {
    expect(formatAmount(-717)).toBe(`${MINUS}717`)
    expect(formatAmount(-717)).not.toContain('-')
  })
})

describe('formatSignedAmount', () => {
  it('늘면 +, 줄면 유니코드 마이너스, 0은 부호 없이', () => {
    expect(formatSignedAmount(3000)).toBe('+3,000')
    expect(formatSignedAmount(-10000)).toBe(`${MINUS}10,000`)
    expect(formatSignedAmount(0)).toBe('0')
  })
})

describe('formatPrice', () => {
  it('금액 뒤에 원을 붙인다', () => {
    expect(formatPrice(23900)).toBe('23,900원')
    expect(formatPrice(0)).toBe('0원')
  })

  it('음수는 −717원으로 표기한다', () => {
    expect(formatPrice(-717)).toBe('−717원')
  })

  it('deduct면 양수도 차감으로 표기한다', () => {
    expect(formatPrice(717, { deduct: true })).toBe('−717원')
    expect(formatPrice(-717, { deduct: true })).toBe('−717원')
  })

  it('0원 차감에는 부호를 붙이지 않는다', () => {
    expect(formatPrice(0, { deduct: true })).toBe('0원')
  })
})

describe('formatDate', () => {
  it('기본은 상세 표기 2026.10.08(목)', () => {
    expect(formatDate('2026-10-08T09:00:00')).toBe('2026.10.08(목)')
  })

  it('short는 목록 표기 10.08', () => {
    expect(formatDate('2026-10-08T09:00:00', 'short')).toBe('10.08')
  })

  it('dateTime은 10월 13일 14:30', () => {
    expect(formatDate('2026-10-13T14:30:00', 'dateTime')).toBe('10월 13일 14:30')
    expect(formatDate('2026-01-05T09:05:00', 'dateTime')).toBe('1월 5일 09:05')
  })

  it('monthDay는 10월 16일, monthDayWeek는 10월 16일(금), month는 10월', () => {
    expect(formatDate('2026-10-16T00:00:00', 'monthDay')).toBe('10월 16일')
    expect(formatDate('2026-10-16T00:00:00', 'monthDayWeek')).toBe('10월 16일(금)')
    expect(formatDate('2026-10-16T00:00:00', 'month')).toBe('10월')
  })

  it('Date 객체도 받는다', () => {
    expect(formatDate(new Date(2026, 9, 11), 'date')).toBe('2026.10.11(일)')
  })

  it('읽을 수 없는 값이면 빈 문자열', () => {
    expect(formatDate('not-a-date')).toBe('')
  })
})

describe('formatQuantity', () => {
  it('수량만 있으면 N개', () => {
    expect(formatQuantity(1)).toBe('1개')
    expect(formatQuantity(1200)).toBe('1,200개')
  })

  it('옵션명이 있으면 옵션 × 수량', () => {
    expect(formatQuantity(1, '3kg')).toBe('3kg × 1')
    expect(formatQuantity(2, '5kg (16~18과)')).toBe('5kg (16~18과) × 2')
  })
})
