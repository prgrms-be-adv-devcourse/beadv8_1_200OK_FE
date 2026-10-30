import { Button } from '@mantine/core'
import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { DisabledReason } from './DisabledReason'

describe('DisabledReason', () => {
  it('이유를 버튼 아래에 보여 주고 버튼 설명으로 잇는다', () => {
    render(
      <DisabledReason reason="예치금이 부족해 결제할 수 없어요">
        <Button disabled>결제하기</Button>
      </DisabledReason>,
    )
    expect(screen.getByRole('button', { name: '결제하기' })).toHaveAccessibleDescription(
      '예치금이 부족해 결제할 수 없어요',
    )
  })

  it('이유가 없으면 문구도 설명도 없다', () => {
    render(
      <DisabledReason reason={null}>
        <Button>결제하기</Button>
      </DisabledReason>,
    )
    expect(screen.getByRole('button', { name: '결제하기' })).not.toHaveAttribute('aria-describedby')
  })
})
