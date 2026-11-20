import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ProductCategory, ProductRegion, ProductSort } from '@/shared/api/types'
import { render } from '@/test/render'
import { categoryOptions, productCardItems } from '../fixtures'
import { ProductListView, type ProductListViewProps } from './ProductListView'

function renderList(props: Partial<ProductListViewProps> = {}) {
  const handlers = {
    onRegionChange: vi.fn(),
    onHideSoldOutChange: vi.fn(),
    onToggleLike: vi.fn(),
  }
  render(
    <MemoryRouter>
      <ProductListView
        status="success"
        items={productCardItems}
        categories={categoryOptions}
        hideSoldOut={false}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  )
  return handlers
}

describe('ProductListView', () => {
  it('카테고리 이름이 제목이고 개수를 알려 준다', () => {
    renderList({ category: ProductCategory.FRUIT, totalCount: 2 })

    expect(screen.getAllByRole('heading', { level: 1, name: '과일' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('status')).toHaveTextContent('상품 2개')
  })

  it('빈 카테고리는 전체 상품으로 이끈다', () => {
    renderList({ category: ProductCategory.GRAIN, items: [], totalCount: 0 })

    expect(screen.getByText('쌀·잡곡 상품이 아직 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '전체 상품 보기' })).toHaveAttribute(
      'href',
      '/products',
    )
  })

  it('품절 제외로 0개면 품절 상품도 보기를 준다', async () => {
    const user = userEvent.setup()
    const { onHideSoldOutChange } = renderList({
      items: [],
      totalCount: 0,
      hideSoldOut: true,
      hiddenSoldOutCount: 1,
    })

    await user.click(screen.getByRole('button', { name: '품절 상품도 보기' }))
    expect(onHideSoldOutChange).toHaveBeenCalledWith(false)
  })

  it('검색 중이면 카테고리 칩이 검색어·정렬을 두고 카테고리만 바꾼다', () => {
    renderList({ query: '사과', sort: ProductSort.PRICE_ASC, category: ProductCategory.FRUIT })

    const nav = screen.getByRole('navigation', { name: '카테고리' })
    expect(within(nav).getByRole('link', { name: '과일' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: '채소' })).toHaveAttribute(
      'href',
      `/products?${new URLSearchParams({ q: '사과', category: 'VEGETABLE', sort: 'PRICE_ASC' })}`,
    )
    expect(within(nav).getByRole('link', { name: '전체' })).toHaveAttribute(
      'href',
      `/products?${new URLSearchParams({ q: '사과', sort: 'PRICE_ASC' })}`,
    )
  })

  it('조건을 둔 검색이 0개면 조건 없이 다시 찾게 한다', () => {
    renderList({ query: '사과', region: ProductRegion.JEJU, items: [], totalCount: 0 })

    expect(screen.getByText('‘사과’와 맞는 상품이 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '조건 없이 다시 찾기' })).toHaveAttribute(
      'href',
      `/products?${new URLSearchParams({ q: '사과' })}`,
    )
  })

  it('산지를 고르면 알린다', async () => {
    const user = userEvent.setup()
    const { onRegionChange } = renderList()

    await user.selectOptions(screen.getByRole('combobox', { name: '산지' }), '제주')
    expect(onRegionChange).toHaveBeenCalledWith('JEJU')
  })
})
