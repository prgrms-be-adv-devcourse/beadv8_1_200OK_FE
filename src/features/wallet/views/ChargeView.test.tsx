import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { BALANCE_DEFAULT, BALANCE_SHORT, walletTerms } from '../fixtures'
import { ChargeView, type ChargeViewProps } from './ChargeView'

const agreed = walletTerms.map((item) => ({ ...item, agreed: true }))

function renderCharge(props: Partial<ChargeViewProps> = {}) {
  const onCharge = vi.fn()
  render(
    <MemoryRouter>
      <ChargeView balance={BALANCE_DEFAULT} terms={agreed} onCharge={onCharge} {...props} />
    </MemoryRouter>,
  )
  return { onCharge, user: userEvent.setup() }
}

describe('ChargeView', () => {
  it('최소 금액보다 적으면 막는다', async () => {
    const { user } = renderCharge()
    await user.type(screen.getByLabelText('충전 금액'), '15000')

    expect(screen.getByText('20,000원부터 충전할 수 있어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '충전하기' })).toBeDisabled()
  })

  it('주문서에서 오면 부족 금액을 최소 충전 금액으로 맞춰 둔다', async () => {
    const { user, onCharge } = renderCharge({
      balance: BALANCE_SHORT,
      shortfall: 7800,
      returnTo: '/checkout',
    })

    expect(screen.getByText('주문하려면 7,800원이 더 필요해요')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '부족한 금액만큼' }))
    expect(
      screen.getByText('부족한 7,800원을 최소 충전 금액 20,000원으로 맞췄어요'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '20,000원 충전하기' }))
    expect(onCharge).toHaveBeenCalledWith({ amount: 20000 })
  })

  it('첫 충전이면 약관에 모두 동의해야 충전한다', async () => {
    const { user, onCharge } = renderCharge({ terms: walletTerms, defaultAmount: 50000 })

    await user.click(screen.getByRole('button', { name: '50,000원 충전하기' }))
    const agree = await screen.findByRole('button', { name: '동의하고 충전하기' })
    expect(agree).toBeDisabled()

    await user.click(screen.getByLabelText('전체 동의'))
    await user.click(agree)

    expect(onCharge).toHaveBeenCalledWith({
      amount: 50000,
      agreements: walletTerms
        .filter((item) => !item.agreed)
        .map(({ type, version }) => ({ type, version })),
    })
  })
})
