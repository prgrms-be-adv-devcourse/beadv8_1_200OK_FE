import { isApiError } from '@/shared/api/ApiError'

// 관리자 콘솔 오류 문구. 서버 detail을 그대로 쓰되(DECISIONS.md A-13), 두 가지만 해요체로 바꾼다.
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
