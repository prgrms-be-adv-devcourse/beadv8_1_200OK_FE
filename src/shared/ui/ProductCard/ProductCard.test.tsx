import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import {
  ProductCategory,
  ProductRegion,
  ProductStatus,
  type ProductSummary,
} from '@/shared/api/types'
import { render } from '@/test/render'
import { ProductCard } from './ProductCard'

const product: ProductSummary = {
  productId: 7,
  name: '청송 꿀사과 부사',
  thumbnailUrl: '',
  minSalePrice: 23900,
  minPriceListPrice: 26900,
  discountRate: 11,
  category: ProductCategory.FRUIT,
  region: ProductRegion.GYEONGBUK,
  status: ProductStatus.ON_SALE,
  soldOut: false,
  reviewCount: 128,
  averageRating: 4.8,
}

function renderCard(props: Partial<Parameters<typeof ProductCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} {...props} />
    </MemoryRouter>,
  )
}

describe('ProductCard', () => {
  it('상품명이 상세 링크다', () => {
    renderCard()
    expect(screen.getByRole('link', { name: '청송 꿀사과 부사' })).toHaveAttribute(
      'href',
      '/products/7',
    )
  })

  it('산지 라인과 평점을 보여 준다', () => {
    renderCard({ sellerName: '청송 햇살농원' })
    expect(screen.getByText('경북 · 청송 햇살농원')).toBeInTheDocument()
    expect(screen.getByText('별점 5점 만점에 4.8점, 리뷰 128개')).toBeInTheDocument()
  })

  it('리뷰가 0개면 평점 줄을 숨긴다', () => {
    renderCard({ product: { ...product, reviewCount: 0, averageRating: 0 } })
    expect(screen.queryByText(/별점/)).not.toBeInTheDocument()
  })

  it('품절이면 일시 품절 라벨을 덮는다', () => {
    renderCard({ product: { ...product, soldOut: true } })
    expect(screen.getByText('일시 품절')).toBeInTheDocument()
  })

  it('관심 하트는 눌린 상태를 알려 주고 콜백을 부른다', async () => {
    const user = userEvent.setup()
    const onToggleLike = vi.fn()
    renderCard({ liked: true, onToggleLike })
    const heart = screen.getByRole('button', { name: '청송 꿀사과 부사 관심 상품' })
    expect(heart).toHaveAttribute('aria-pressed', 'true')
    await user.click(heart)
    expect(onToggleLike).toHaveBeenCalledTimes(1)
  })
})
