import { isApiError } from '@/shared/api/ApiError'
import type { ReviewFieldErrors } from './views/ReviewWriteView'

// 리뷰 등록·수정·삭제 실패를 화면 자리로 나눈다. 문구는 서버 detail을 그대로 쓴다(DECISIONS.md A-13).
// - 422 errors[].path rating·content → 그 칸, mediaUrls… → 사진·영상 칸
// - 422 첨부 URL·영상 개수(errors 없이 type product/invalid-review-media-url · review-media-limit-exceeded) → 사진·영상 칸
// - 나머지(401·403·404·409 이미 리뷰 작성·5xx·네트워크) → 폼 위 문구

export type ReviewSubmitErrors = {
  fields?: ReviewFieldErrors
  media?: string
  message?: string
}

export type ReviewAction = 'create' | 'update' | 'delete' | 'load'

const formFields = ['rating', 'content'] as const

/** 폼 위·확인 창·불러오기 오류에 쓸 문구 */
export function reviewErrorMessage(error: unknown, _action: ReviewAction): string {
  if (!isApiError(error)) return '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'
  return error.detail
}

export function toReviewSubmitErrors(error: unknown, action: ReviewAction): ReviewSubmitErrors {
  if (!error) return {}
  if (!isApiError(error) || error.status !== 422) {
    return { message: reviewErrorMessage(error, action) }
  }

  const paths = error.fieldErrors
  const fields: ReviewFieldErrors = {}
  for (const field of formFields) if (paths[field]) fields[field] = paths[field]
  const mediaPath = Object.keys(paths).find((path) => path.startsWith('mediaUrls'))
  const media = mediaPath
    ? paths[mediaPath]
    : error.type?.includes('review-media')
      ? error.detail
      : undefined

  const hasFields = Object.keys(fields).length > 0
  if (!hasFields && !media) return { message: error.detail }
  return { fields: hasFields ? fields : undefined, media }
}
