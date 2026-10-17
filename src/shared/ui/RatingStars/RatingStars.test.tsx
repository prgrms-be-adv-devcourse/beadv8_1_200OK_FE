import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { RatingStars, starFills } from './RatingStars'

describe('starFills', () => {
  it('0.5 단위로 반올림해 채운다', () => {
    expect(starFills(5)).toEqual(['full', 'full', 'full', 'full', 'full'])
    expect(starFills(4.5)).toEqual(['full', 'full', 'full', 'full', 'half'])
    expect(starFills(4.8)).toEqual(['full', 'full', 'full', 'full', 'full'])
    expect(starFills(4.6)).toEqual(['full', 'full', 'full', 'full', 'half'])
    expect(starFills(4.2)).toEqual(['full', 'full', 'full', 'full', 'empty'])
    expect(starFills(0)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty'])
  })
})

describe('RatingStars', () => {
  it('화면 낭독용 문장을 둔다', () => {
    render(<RatingStars value={4.8} reviewCount={128} variant="compact" />)
    expect(screen.getByText('별점 5점 만점에 4.8점, 리뷰 128개')).toBeInTheDocument()
  })

  it('보이는 별과 숫자는 낭독에서 숨긴다', () => {
    const { container } = render(<RatingStars value={4.5} />)
    const hidden = container.querySelectorAll('[aria-hidden="true"]')
    expect([...hidden].map((el) => el.textContent).join('')).toContain('4.5')
  })
})
