import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { QueryState } from './QueryState'

function renderState(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('QueryState', () => {
  it('성공이면 children을 그린다', () => {
    renderState(<QueryState status="success">목록</QueryState>)
    expect(screen.getByText('목록')).toBeInTheDocument()
  })

  it('로딩이면 스켈레톤과 읽을 문구를 둔다', () => {
    renderState(<QueryState status="pending">목록</QueryState>)
    expect(screen.getByRole('status')).toHaveTextContent('불러오고 있어요')
    expect(screen.queryByText('목록')).not.toBeInTheDocument()
  })

  it('오류면 다시 시도를 누를 수 있다', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderState(<QueryState status="error" onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('불러오지 못했어요')
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('빈 상태는 화면이 넘긴 문구와 CTA 하나를 보여 준다', () => {
    renderState(
      <QueryState
        status="empty"
        empty={{ title: '장바구니가 비어 있어요', action: { label: '홈으로', to: '/' } }}
      />,
    )
    expect(screen.getByText('장바구니가 비어 있어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '홈으로' })).toHaveAttribute('href', '/')
  })

  it('404는 기본 문구와 홈 링크', () => {
    renderState(<QueryState status="notFound" notFound={{ title: '찾으시는 상품이 없어요' }} />)
    expect(screen.getByText('찾으시는 상품이 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '홈으로' })).toBeInTheDocument()
  })
})
