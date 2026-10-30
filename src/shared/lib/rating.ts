// 리뷰 별점은 0.5점 단위를 정수 1~10으로 주고받는다 (9 = 4.5점). 원본: bruno_for_front/enums.ts
// 상품의 averageRating은 이미 5점 만점이라 변환하지 않는다.

/** API rating(1~10) → 화면 별점(0.5~5) */
export const toStarRating = (rating: number) => rating / 2

/** 화면 별점(0.5~5) → API rating(1~10) */
export const fromStarRating = (stars: number) => Math.round(stars * 2)
