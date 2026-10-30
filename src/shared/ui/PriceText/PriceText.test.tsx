import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { PriceText } from './PriceText'

describe('PriceText', () => {
  it('금액과 원을 보여 준다', () => {
    const { container } = render(<PriceText amount={23900} />)
    expect(container).toHaveTextContent('23,900원')
  })

  it('할인이면 할인율 → 판매가 → 정가 순서로, 낭독용 문구를 붙인다', () => {
    const { container } = render(<PriceText amount={23900} discountRate={11} listPrice={27000} />)
    expect(container).toHaveTextContent('11% 할인23,900원정가 27,000원')
    expect(screen.getByText('27,000', { exact: false }).closest('s')).toBeInTheDocument()
  })

  it('정가가 판매가보다 크지 않으면 정가를 숨긴다', () => {
    const { container } = render(<PriceText amount={23900} listPrice={23900} />)
    expect(container.querySelector('s')).toBeNull()
  })

  it('차감은 유니코드 마이너스로 표기한다', () => {
    const { container } = render(<PriceText amount={717} deduct />)
    expect(container).toHaveTextContent('−717원')
  })

  it('0원 차감에는 부호를 붙이지 않는다', () => {
    const { container } = render(<PriceText amount={0} deduct />)
    expect(container).toHaveTextContent('0원')
    expect(container).not.toHaveTextContent('−')
  })
})
