import dayjs from 'dayjs'

// 서버 기간 파라미터 도우미. 정산(판매자·관리자)·이용 내역이 같이 쓴다.
// 정산 API: from(포함)·to(미포함)은 "yyyy-MM-ddTHH:mm:ss"(zone 없음, KST), 최대 1년.
// 이용 내역 API: from·to는 "yyyy-MM-dd"(둘 다 포함).

export type DateTimeRange = { from: string; to: string }

export const toServerDateTime = (value: dayjs.ConfigType) =>
  dayjs(value).format('YYYY-MM-DD[T]HH:mm:ss')

export const toServerDate = (value: dayjs.ConfigType) => dayjs(value).format('YYYY-MM-DD')

/** 최근 1년: 내일 0시(미포함)부터 1년 전까지. 서버 최대 범위가 정확히 1년 */
export function recentYear(): DateTimeRange {
  const to = dayjs().add(1, 'day').startOf('day')
  return { from: toServerDateTime(to.subtract(1, 'year')), to: toServerDateTime(to) }
}

/** 이번 달 1일 0시 ~ 다음 달 1일 0시 */
export function thisMonth(): DateTimeRange {
  const from = dayjs().startOf('month')
  return { from: toServerDateTime(from), to: toServerDateTime(from.add(1, 'month')) }
}

/** 날짜(yyyy-MM-dd, 포함) ~ 날짜(포함) → 서버 from(포함)·to(미포함, 다음 날 0시) */
export function dayRangeToServer(from: string, to: string): DateTimeRange {
  return {
    from: toServerDateTime(dayjs(from).startOf('day')),
    to: toServerDateTime(dayjs(to).add(1, 'day').startOf('day')),
  }
}

/** 오늘까지 최근 n일 (yyyy-MM-dd 쌍). 화면 기간 필터 기본값 */
export function recentDays(days: number): { from: string; to: string } {
  const to = dayjs().startOf('day')
  return { from: toServerDate(to.subtract(days - 1, 'day')), to: toServerDate(to) }
}
