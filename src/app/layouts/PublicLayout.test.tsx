import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { render } from '@/test/render'
import { PublicLayoutView } from './PublicLayout'

// 헤더 검색창(데스크톱)과 모바일 상단 바의 검색 버튼

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <PublicLayoutView session={{ status: 'guest' }} showMobileHeader>
            <p>본문</p>
          </PublicLayoutView>
        ),
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return { router, user: userEvent.setup() }
}

const headerSearch = () => {
  const header = screen.getAllByRole('banner')[0] as HTMLElement
  return {
    input: within(header).getByRole('searchbox', { name: '상품 검색어' }),
    submit: within(header).getByRole('button', { name: '검색' }),
  }
}

describe('PublicLayout 헤더 검색', () => {
  it('제출하면 앞뒤 공백을 뺀 검색어로 상품 목록을 연다', async () => {
    const { router, user } = renderAt('/products?category=FRUIT')
    const { input } = headerSearch()

    await user.type(input, '  햇사과 {Enter}')
    expect(router.state.location.pathname).toBe('/products')
    expect(Object.fromEntries(new URLSearchParams(router.state.location.search))).toEqual({
      q: '햇사과',
    })
  })

  it('빈 검색어는 막고 이유를 보여 준다', async () => {
    const { router, user } = renderAt('/')
    const { input, submit } = headerSearch()

    await user.click(submit)
    expect(screen.getByText('찾을 상품 이름을 입력해 주세요')).toBeInTheDocument()
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(router.state.location.pathname).toBe('/')

    // 입력을 고치면 오류를 지운다
    await user.type(input, '배')
    expect(screen.queryByText('찾을 상품 이름을 입력해 주세요')).not.toBeInTheDocument()
  })

  it('상품 목록에서는 지금 검색어를 보여 준다', () => {
    renderAt(`/products?${new URLSearchParams({ q: '고구마' })}`)

    expect(headerSearch().input).toHaveValue('고구마')
  })

  it('모바일 상단 바의 검색 버튼은 상품 목록으로 간다', () => {
    renderAt('/')

    expect(screen.getByRole('link', { name: '상품 검색' })).toHaveAttribute('href', '/products')
  })
})
