import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { BALANCE_DEFAULT, walletTerms } from '../fixtures'
import { ChargeView } from '../views/ChargeView'

describe('TermsAgreementModal 약관 보기', () => {
  it('동의 창 위에 약관 본문을 열고, 닫으면 체크·충전 금액을 그대로 두고 보기 버튼으로 돌아온다', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ChargeView balance={BALANCE_DEFAULT} terms={walletTerms} onCharge={() => {}} />
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('충전 금액'), '50000')
    await user.click(screen.getByRole('button', { name: '50,000원 충전하기' }))
    await user.click(await screen.findByLabelText('[필수] 전자금융거래 이용약관'))

    const view = screen.getByRole('button', { name: '전자금융거래 이용약관 보기' })
    expect(view).toHaveAttribute('aria-haspopup', 'dialog')
    await user.click(view)

    const sheet = await screen.findByRole('dialog', { name: '전자금융거래 이용약관' })
    expect(sheet).toHaveTextContent('제1조 (목적)')
    expect(sheet).toHaveTextContent('필수 · v1')

    await user.click(screen.getByRole('button', { name: '확인했어요' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '전자금융거래 이용약관' }),
      ).not.toBeInTheDocument(),
    )
    expect(
      screen.getByRole('dialog', { name: '첫 충전 전에 약관에 동의해 주세요' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('[필수] 전자금융거래 이용약관')).toBeChecked()
    await waitFor(() => expect(view).toHaveFocus())

    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.getByLabelText('충전 금액')).toHaveValue('50,000')
  })
})
