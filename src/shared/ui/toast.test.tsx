import { notifications } from '@mantine/notifications'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { showToast } from './toast'

afterEach(() => {
  act(() => notifications.clean())
})

describe('showToast', () => {
  it('문구만 보여 준다', async () => {
    render(<div />)
    act(() => {
      showToast({ message: '장바구니에 담았어요' })
    })

    expect(await screen.findByText('장바구니에 담았어요')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('액션을 누르면 콜백을 부르고 토스트를 닫는다', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<div />)
    act(() => {
      showToast({ message: '장바구니에 담았어요', action: { label: '장바구니 보기', onClick } })
    })

    await user.click(await screen.findByRole('button', { name: '장바구니 보기' }))

    expect(onClick).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByText('장바구니에 담았어요')).not.toBeInTheDocument()
    })
  })
})
