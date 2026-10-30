// 사진(·영상) 고르기 검사: 남은 자리 수, 장당 용량, 영상 개수. 넘친 파일은 빼고 이유를 하나 돌려준다.

export const VIDEO_TYPES = ['video/mp4']

export type VideoRules = {
  /** 올릴 수 있는 영상 수 (예: 리뷰 1개) */
  maxCount: number
  maxSizeMb: number
  /** 이미 올린 영상 수 */
  current: number
}

export type PhotoRules = {
  /** 더 올릴 수 있는 장수 (사진 + 영상) */
  remaining: number
  max: number
  maxSizeMb: number
  accept: string[]
  /** 있으면 mp4 영상도 받는다 */
  video?: VideoRules
}

export function validatePhotos(
  files: File[],
  { remaining, max, maxSizeMb, accept, video }: PhotoRules,
): { accepted: File[]; error: string | null } {
  const isVideo = (file: File) => video !== undefined && VIDEO_TYPES.includes(file.type)
  const typeOk = files.filter((file) => accept.includes(file.type) || isVideo(file))
  const sizeOk = typeOk.filter((file) =>
    isVideo(file)
      ? file.size <= (video?.maxSizeMb ?? 0) * 1024 * 1024
      : file.size <= maxSizeMb * 1024 * 1024,
  )

  let videoSlots = video ? Math.max(video.maxCount - video.current, 0) : 0
  const countOk = sizeOk.filter((file) => {
    if (!isVideo(file)) return true
    if (videoSlots === 0) return false
    videoSlots -= 1
    return true
  })
  const accepted = countOk.slice(0, Math.max(remaining, 0))

  const unit = video ? '개' : '장'
  let error: string | null = null
  if (typeOk.length < files.length) {
    error = video ? 'jpg·png 사진이나 mp4 영상만 올릴 수 있어요' : 'jpg·png 사진만 올릴 수 있어요'
  } else if (sizeOk.length < typeOk.length) {
    const tooBigVideo = typeOk.some(
      (file) => isVideo(file) && file.size > (video?.maxSizeMb ?? 0) * 1024 * 1024,
    )
    error = tooBigVideo
      ? `영상은 ${video?.maxSizeMb}MB 이하로 올려 주세요`
      : `사진은 ${maxSizeMb}MB 이하로 올려 주세요`
  } else if (countOk.length < sizeOk.length) {
    error = `영상은 ${video?.maxCount}개까지 올릴 수 있어요`
  } else if (accepted.length < countOk.length) {
    error = `${video ? '사진·영상' : '사진'}은 최대 ${max}${unit}까지 올릴 수 있어요`
  }

  return { accepted, error }
}
