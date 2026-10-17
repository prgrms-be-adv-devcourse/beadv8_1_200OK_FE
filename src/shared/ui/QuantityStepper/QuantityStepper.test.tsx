import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { QuantityStepper } from './QuantityStepper'

describe('QuantityStepper', () => {
  it('최소(1)에서는 줄이기 버튼이 비활성', () => {
    render(<QuantityStepper value={1} onChange={() => {}} max={10} />)
    expect(screen.getByRole('button', { name: '수량 줄이기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '수량 늘리기' })).toBeEnabled()
  })

  it('최대에서는 늘리기 버튼이 비활성이고 도움말을 연결한다', () => {
    render(<QuantityStepper value={10} onChange={() => {}} max={10} />)
    expect(screen.getByRole('button', { name: '수량 늘리기' })).toBeDisabled()
    expect(screen.getByRole('group', { name: '수량' })).toHaveAccessibleDescription(
      '최대 10개까지 담을 수 있어요',
    )
  })

  it('누르면 한 개씩 바꾼다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<QuantityStepper value={3} onChange={onChange} max={10} />)
    await user.click(screen.getByRole('button', { name: '수량 늘리기' }))
    await user.click(screen.getByRole('button', { name: '수량 줄이기' }))
    expect(onChange.mock.calls).toEqual([[4], [2]])
  })
})
