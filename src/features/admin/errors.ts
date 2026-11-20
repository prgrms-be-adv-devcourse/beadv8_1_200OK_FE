import { isApiError } from '@/shared/api/ApiError'
import { formatDate } from '@/shared/lib/format'

// 관리자 콘솔 오류 문구. 서버 detail을 그대로 쓰되(DECISIONS.md A-13), 아래 두 가지와 정산 실행·해결 409만 해요체로 바꾼다.
// - 501: 서버가 막아 둔 기능(1건 정산 · 수동 조정). detail이 "아직 지원하지 않는 기능입니다."라 안내로 바꾼다
// - 404 "No static resource …": 서버에 아직 없는 경로(Spring 내부 문구). 화면에 그대로 내지 않는다

export const UNSUPPORTED_MESSAGE = '아직 지원하지 않는 기능이에요. 서버에서 준비되면 쓸 수 있어요'
const UNAVAILABLE_MESSAGE = '지금은 이 기능을 쓸 수 없어요. 잠시 뒤 다시 시도해 주세요'
const GENERIC_MESSAGE = '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'

export function adminErrorMessage(error: unknown): string {
  if (!isApiError(error)) return GENERIC_MESSAGE
  if (error.status === 501) return UNSUPPORTED_MESSAGE
  if (error.status === 404 && error.detail.startsWith('No static resource')) {
    return UNAVAILABLE_MESSAGE
  }
  return error.detail
}

/** 409: 상태가 바뀌었거나 다른 관리자가 먼저 처리함 → 다시 불러와 화면을 맞춘다 */
export const isConflict = (error: unknown) => isApiError(error) && error.status === 409

// 정산 실행 409. detail이 합니다체이고 type이 about:blank라, 실행 중인지 꺼졌는지는 detail로 가른다
export const PAYOUT_RUNNING_MESSAGE = '정산이 이미 실행 중이에요. 끝난 뒤 다시 실행해 주세요'
export const SKIP_WAIT_DISABLED_MESSAGE =
  '대기 건너뛰기 실행이 서버 설정으로 꺼져 있어요. 서버에서 켜야 쓸 수 있어요'

export function payoutRunErrorMessage(error: unknown, kind: 'run' | 'skipWait'): string {
  if (!isApiError(error) || error.status !== 409) return adminErrorMessage(error)
  if (kind === 'skipWait' && !error.detail.includes('실행 중')) return SKIP_WAIT_DISABLED_MESSAGE
  return PAYOUT_RUNNING_MESSAGE
}

export const NOTHING_TO_RESOLVE_MESSAGE =
  '해결할 잠금이나 멈춤이 없는 주문이에요. 이미 해결됐을 수 있어 목록을 다시 불러왔어요'

// 검색 점검 400. detail이 합니다체라 해요체로 바꾼다. type은 서버 설정에 따라 about:blank일 수 있어 detail도 같이 본다
const RETENTION_DATE = /시작일은 (\d{4}-\d{2}-\d{2}) 이후/
const isProblemType = (error: { type: string | null }, slug: string) =>
  error.type?.endsWith(slug) ?? false

export const SEARCH_PERIOD_ORDER_MESSAGE = '시작일이 종료일보다 늦어요. 기간을 다시 골라 주세요'
export const SEARCH_RETENTION_MESSAGE =
  '검색어 기록은 보존 기간(기본 90일)만 남아 있어요. 시작일을 더 최근으로 골라 주세요'
export const SEARCH_BAD_REQUEST_MESSAGE = '기간이나 개수를 읽지 못했어요. 다시 골라 주세요'

export function searchInsightsErrorMessage(error: unknown): string {
  if (!isApiError(error) || error.status !== 400) return adminErrorMessage(error)
  const oldest = RETENTION_DATE.exec(error.detail)?.[1]
  if (oldest) {
    return `검색어 기록은 ${formatDate(oldest, 'date')}부터 남아 있어요. 시작일을 그 뒤로 골라 주세요`
  }
  if (isProblemType(error, 'search-log-period-beyond-retention')) return SEARCH_RETENTION_MESSAGE
  if (
    isProblemType(error, 'invalid-search-log-period') ||
    isProblemType(error, 'invalid-tag-judgment-period') ||
    error.detail.includes('종료일보다 늦을 수 없')
  ) {
    return SEARCH_PERIOD_ORDER_MESSAGE
  }
  return SEARCH_BAD_REQUEST_MESSAGE
}
