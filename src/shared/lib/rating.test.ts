import { fromStarRating, toStarRating } from './rating'

describe('toStarRating', () => {
  it('API rating을 2로 나눈다', () => {
    expect(toStarRating(9)).toBe(4.5)
    expect(toStarRating(10)).toBe(5)
    expect(toStarRating(1)).toBe(0.5)
  })
})

describe('fromStarRating', () => {
  it('화면 별점에 2를 곱해 정수로 만든다', () => {
    expect(fromStarRating(4.5)).toBe(9)
    expect(fromStarRating(5)).toBe(10)
    expect(fromStarRating(0.5)).toBe(1)
  })

  it('왕복하면 원래 값이 된다', () => {
    for (let rating = 1; rating <= 10; rating++) {
      expect(fromStarRating(toStarRating(rating))).toBe(rating)
    }
  })
})
