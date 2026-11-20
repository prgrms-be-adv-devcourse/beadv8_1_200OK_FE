import { isApiError } from '@/shared/api/ApiError'

// 관리자 콘솔 오류 문구. 서버 detail을 그대로 쓰되(DECISIONS.md A-13), 아래 두 가지와 정산 실행·해결·조정 409만 해요체로 바꾼다.
// - 501: 서버가 막아 둔 기능(지금은 1건 정산만). detail이 "아직 지원하지 않는 기능입니다."라 안내로 바꾼다
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

// 조정 409: 같은 주문 항목·종류·금액·사유의 조정이 이미 있음(같은 요청 재전송·동시 요청). 그대로 또 넣으면 판매자가 두 번 덜 받는다
export const DUPLICATE_ADJUSTMENT_MESSAGE =
  '같은 조정이 이미 있어요. 막힌 주문의 대기 조정 합계나 정산후보에서 들어갔는지 먼저 확인해 주세요. 일부러 한 번 더 넣으려면 사유를 다르게 적어요'

export function adjustmentErrorMessage(error: unknown): string {
  if (isApiError(error) && error.status === 409) return DUPLICATE_ADJUSTMENT_MESSAGE
  return adminErrorMessage(error)
}
