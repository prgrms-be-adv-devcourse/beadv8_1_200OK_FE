import { z } from 'zod'

// 리뷰 검증. 별점은 API 값(1~10, 0.5점 단위 × 2), 본문은 API 2,000자 이하 + 시안의 10자 이상(DECISIONS.md A-3).

export const REVIEW_MIN = 10
export const REVIEW_MAX = 2000
export const REVIEW_MEDIA_MAX = 6

export const reviewSchema = z.object({
  rating: z
    .number({ message: '별점을 골라 주세요' })
    .int()
    .min(1, '별점을 골라 주세요')
    .max(10, '별점을 골라 주세요'),
  content: z
    .string()
    .trim()
    .min(REVIEW_MIN, `${REVIEW_MIN}자 이상 써 주세요`)
    .max(REVIEW_MAX, '2,000자까지 쓸 수 있어요'),
})

export type ReviewFormValues = z.infer<typeof reviewSchema>
