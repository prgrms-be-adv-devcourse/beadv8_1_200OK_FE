// 사진 고르기 검사: 남은 자리 수와 장당 용량. 넘친 사진은 빼고 이유를 하나 돌려준다.

export type PhotoRules = {
  /** 더 올릴 수 있는 장수 */
  remaining: number
  max: number
  maxSizeMb: number
  accept: string[]
}

export function validatePhotos(
  files: File[],
  { remaining, max, maxSizeMb, accept }: PhotoRules,
): { accepted: File[]; error: string | null } {
  const typeOk = files.filter((file) => accept.includes(file.type))
  const sizeOk = typeOk.filter((file) => file.size <= maxSizeMb * 1024 * 1024)
  const accepted = sizeOk.slice(0, Math.max(remaining, 0))

  let error: string | null = null
  if (typeOk.length < files.length) error = 'jpg·png·webp 사진만 올릴 수 있어요'
  else if (sizeOk.length < typeOk.length) error = `사진은 ${maxSizeMb}MB 이하로 올려 주세요`
  else if (accepted.length < sizeOk.length) error = `사진은 최대 ${max}장까지 올릴 수 있어요`

  return { accepted, error }
}
