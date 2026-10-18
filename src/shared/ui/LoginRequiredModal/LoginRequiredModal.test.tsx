import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { LoginRequiredModal } from './LoginRequiredModal'

describe('LoginRequiredModal', () => {
  it('로그인 뒤 지금 화면으로 돌아오게 한다', async () => {
    render(
      <MemoryRouter initialEntries={['/products/101?tab=reviews']}>
        <LoginRequiredModal reason="cart" onClose={() => {}} />
      </MemoryRouter>,
    )

    expect(await screen.findByText('로그인하고 장바구니에 담아 보세요.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인하기' })).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent('/products/101?tab=reviews')}`,
    )
  })

  it('reason이 없으면 닫혀 있다', () => {
    render(
      <MemoryRouter>
        <LoginRequiredModal reason={null} onClose={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.queryByText('로그인이 필요해요')).not.toBeInTheDocument()
  })
})
