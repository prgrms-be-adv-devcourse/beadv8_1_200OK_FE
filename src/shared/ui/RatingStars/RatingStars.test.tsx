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

  // #85: 반 별을 바깥 상자 폭으로 자르면 SVG가 줄어들어 작은 별이 됐다. 별 크기는 그대로 두고 왼쪽 절반만 칠한다.
  it('반 별은 원래 크기 그대로 왼쪽 절반만 칠한다', () => {
    const { container } = render(<RatingStars value={3.5} size={16} />)
    const half = container.querySelector('svg[data-fill="half"]')
    expect(half).toHaveAttribute('width', '16')
    expect(half).toHaveAttribute('height', '16')

    const clipRect = half?.querySelector('clipPath rect')
    expect(clipRect).toHaveAttribute('x', '0')
    expect(clipRect).toHaveAttribute('width', '12')

    const polygons = half?.querySelectorAll('polygon') ?? []
    expect(polygons).toHaveLength(2)
    expect(polygons[1]).toHaveAttribute('clip-path', `url(#${half?.querySelector('clipPath')?.id})`)
  })

  it('보이는 별과 숫자는 낭독에서 숨긴다', () => {
    const { container } = render(<RatingStars value={4.5} />)
    const hidden = container.querySelectorAll('[aria-hidden="true"]')
    expect([...hidden].map((el) => el.textContent).join('')).toContain('4.5')
  })
})
