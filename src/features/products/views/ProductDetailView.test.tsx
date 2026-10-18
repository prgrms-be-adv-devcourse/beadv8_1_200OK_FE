import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ProductStatus } from '@/shared/api/types'
import { render } from '@/test/render'
import { appleReviews, MY_MEMBER_ID, productDetailOf, sellers } from '../fixtures'
import { ProductDetailView, type ProductDetailViewProps } from './ProductDetailView'

const apple = productDetailOf(101)

function renderDetail(props: Partial<ProductDetailViewProps> = {}) {
  const handlers = { onAddToCart: vi.fn(), onToggleLike: vi.fn(), onToggleFollow: vi.fn() }
  render(
    <MemoryRouter>
      <ProductDetailView
        status="success"
        product={apple}
        seller={sellers.cheongsong}
        reviews={appleReviews}
        currentMemberId={MY_MEMBER_ID}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  )
  return handlers
}

describe('ProductDetailView', () => {
  it('고른 옵션과 수량으로 담는다', async () => {
    const user = userEvent.setup()
    const { onAddToCart } = renderDetail()

    const [desktop] = screen.getAllByRole('radio', { name: /2kg/ })
    if (!desktop) throw new Error('옵션 없음')
    await user.click(desktop)
    const [plus] = screen.getAllByRole('button', { name: '수량 늘리기' })
    if (!plus) throw new Error('수량 버튼 없음')
    await user.click(plus)
    const [add] = screen.getAllByRole('button', { name: '장바구니 담기' })
    if (!add) throw new Error('담기 버튼 없음')
    await user.click(add)

    expect(onAddToCart).toHaveBeenCalledWith({ optionId: 1012, quantity: 2 })
  })

  it('판매 종료면 담기를 막고 이유를 보여 준다', () => {
    renderDetail({ product: apple && { ...apple, status: ProductStatus.ENDED } })

    for (const button of screen.getAllByRole('button', { name: '장바구니 담기' })) {
      expect(button).toBeDisabled()
    }
    expect(screen.getAllByText('판매가 종료된 상품이에요').length).toBeGreaterThan(0)
  })

  it('정지된 판매자의 상품은 담을 수 없다', () => {
    renderDetail({ seller: { ...sellers.cheongsong, suspended: true } })

    expect(screen.getByText('판매가 중지된 농가예요')).toBeInTheDocument()
    expect(
      screen.getAllByText('판매가 중지된 농가의 상품이라 지금은 구매할 수 없어요').length,
    ).toBeGreaterThan(0)
  })

  it('내 상품이면 담기 대신 수정 링크를 준다', () => {
    renderDetail({ isOwner: true })

    expect(screen.queryByRole('button', { name: '장바구니 담기' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '내 상품이에요 · 상품 수정' })).toHaveAttribute(
      'href',
      '/seller/products/101/edit',
    )
  })

  it('내 리뷰에만 수정·삭제가 있다', () => {
    renderDetail()

    expect(screen.getAllByText('내 리뷰')).toHaveLength(1)
    expect(screen.getByRole('link', { name: '수정' })).toHaveAttribute('href', '/reviews/5003/edit')
  })

  it('리뷰가 없으면 안내한다', () => {
    renderDetail({ product: apple && { ...apple, reviewCount: 0, averageRating: 0 }, reviews: [] })

    expect(screen.getAllByText('아직 리뷰가 없어요').length).toBeGreaterThan(0)
  })

  it('없는 상품이면 404 안내', () => {
    renderDetail({ status: 'notFound', product: undefined })

    expect(screen.getByText('상품을 찾을 수 없어요')).toBeInTheDocument()
  })
})
