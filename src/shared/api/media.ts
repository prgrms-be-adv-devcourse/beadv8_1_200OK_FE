import { apiClient } from './client'
import type { MediaInfo, MediaPurpose } from './types'

// ✅ POST /api/v1/media/{purpose} (multipart, 파트 이름 file). 🔐 구매자·판매자 로그인 필요(관리자는 403). 10분에 50회까지(429).
// 응답 url을 상품 imageUrls·상세설명 <img src>(PRODUCT) · 리뷰 mediaUrls(PRODUCT_REVIEW)에 그대로 넣는다. 다른 곳 URL은 422·제거.
// 오류: 400 빈 파일·지원하지 않는 형식, 413 용량 초과 → 서버 detail을 보여 준다.

// 영상(30MB)도 올리므로 기본 15초 제한을 쓰지 않는다
const UPLOAD_TIMEOUT_MS = 120_000

export async function uploadMedia(
  purpose: MediaPurpose,
  file: File,
  options: { signal?: AbortSignal; onProgress?: (percent: number) => void } = {},
): Promise<MediaInfo> {
  const body = new FormData()
  body.append('file', file)
  const { data } = await apiClient.post<MediaInfo>(`/api/v1/media/${purpose}`, body, {
    timeout: UPLOAD_TIMEOUT_MS,
    signal: options.signal,
    onUploadProgress: (event) => {
      if (event.total) options.onProgress?.(Math.round((event.loaded / event.total) * 100))
    },
  })
  return data
}
