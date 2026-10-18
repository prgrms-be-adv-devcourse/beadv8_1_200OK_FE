import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import {
  BALANCE_ENOUGH,
  BALANCE_SHORT,
  checkoutSample,
  savedAddress,
  sellerNames,
} from '../fixtures'
import { CheckoutView, type CheckoutViewProps } from './CheckoutView'

function renderCheckout(props: Partial<CheckoutViewProps> = {}) {
  const onPay = vi.fn()
  render(
    <MemoryRouter>
      <CheckoutView
        status="success"
        checkout={checkoutSample}
        sellerNames={sellerNames}
        balance={BALANCE_ENOUGH}
        defaultAddress={savedAddress}
        onPay={onPay}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onPay, user: userEvent.setup() }
}

const payButtons = () => screen.getAllByRole('button', { name: '39,800원 결제하기' })

describe('CheckoutView', () => {
  it('판매자 정보 제공에 동의해야 결제할 수 있다', async () => {
    const { user, onPay } = renderCheckout()

    for (const button of payButtons()) expect(button).toBeDisabled()
    expect(screen.getAllByText('판매자 정보 제공에 동의해 주세요').length).toBeGreaterThan(0)

    await user.click(screen.getByLabelText('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요'))
    const [desktop] = payButtons()
    if (!desktop) throw new Error('결제 버튼 없음')
    await user.click(desktop)

    expect(onPay).toHaveBeenCalledWith({
      ...savedAddress,
      thirdPartyProvisionAgreed: true,
      expectedTotalAmount: 39800,
    })
  })

  it('잔액이 부족하면 막고 부족한 만큼 충전하러 보낸다', () => {
    renderCheckout({ balance: BALANCE_SHORT })

    for (const button of payButtons()) expect(button).toBeDisabled()
    expect(screen.getAllByText('예치금이 부족해 결제할 수 없어요').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: '예치금 충전하기' })).toHaveAttribute(
      'href',
      `/wallet/charge?shortfall=7800&returnTo=${encodeURIComponent('/checkout')}`,
    )
  })

  it('배송지가 없으면 먼저 입력하게 한다', () => {
    renderCheckout({ defaultAddress: null })

    expect(screen.getByRole('button', { name: '배송지 입력' })).toBeInTheDocument()
    expect(screen.getAllByText('배송지를 입력해 주세요').length).toBeGreaterThan(0)
  })

  it('금액이 바뀌면(409) 이전 금액과 함께 알린다', () => {
    renderCheckout({ previousTotal: 38800 })

    expect(screen.getByText('주문 금액이 바뀌었어요')).toBeInTheDocument()
    expect(screen.getByText(/38,800원 → 39,800원/)).toBeInTheDocument()
  })
})
