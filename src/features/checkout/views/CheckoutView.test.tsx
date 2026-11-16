import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import {
  BALANCE_ENOUGH,
  BALANCE_SHORT,
  checkoutSample,
  feeQuoteSample,
  remoteQuoteSample,
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
        feeQuote={feeQuoteSample}
        feeQuoteStatus="success"
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
    renderCheckout({ defaultAddress: null, feeQuote: undefined, feeQuoteStatus: 'idle' })

    expect(screen.getByRole('button', { name: '배송지 입력' })).toBeInTheDocument()
    expect(screen.getAllByText('배송지를 입력해 주세요').length).toBeGreaterThan(0)
  })

  it('상세주소가 없는 배송지(예전 초안)면 결제를 막고 상세주소를 넣게 한다', async () => {
    const { user, onPay } = renderCheckout({
      defaultAddress: { ...savedAddress, addressDetail: undefined },
    })
    await user.click(screen.getByLabelText('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요'))

    for (const button of payButtons()) expect(button).toBeDisabled()
    expect(screen.getAllByText('배송지에 상세주소를 입력해 주세요').length).toBeGreaterThan(0)
    expect(onPay).not.toHaveBeenCalled()
  })

  it('도서산간 견적이 오면 추가 운임·도착 예정일을 보여 주고 최종 금액에 더한다', async () => {
    const { user, onPay } = renderCheckout({
      feeQuote: remoteQuoteSample,
      feeQuoteStatus: 'success',
    })

    expect(screen.getAllByText('도서산간 추가 운임')).toHaveLength(3)
    expect(screen.getAllByText('+3,000원')).toHaveLength(2)
    expect(screen.getAllByText('10월 27일~10월 28일(수)')).toHaveLength(2)
    await user.click(screen.getByLabelText('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요'))
    const [desktop] = screen.getAllByRole('button', { name: '45,800원 결제하기' })
    if (!desktop) throw new Error('결제 버튼 없음')
    await user.click(desktop)

    expect(onPay).toHaveBeenCalledWith(expect.objectContaining({ expectedTotalAmount: 45800 }))
  })

  it('견적 배송비를 판매자별·합계에 그리고 최종 금액에 더한다', async () => {
    const quote = {
      ...feeQuoteSample,
      sellers: feeQuoteSample.sellers.map((s) => ({
        ...s,
        baseShippingFee: 3000,
        shippingFee: 3000,
      })),
      totalShippingFee: 6000,
    }
    const { user, onPay } = renderCheckout({ feeQuote: quote })

    // 판매자 2곳 + 합계 배송비
    expect(screen.getAllByText('3,000')).toHaveLength(2)
    expect(screen.getByText('6,000')).toBeInTheDocument()
    await user.click(screen.getByLabelText('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요'))
    const [desktop] = screen.getAllByRole('button', { name: '45,800원 결제하기' })
    if (!desktop) throw new Error('결제 버튼 없음')
    await user.click(desktop)
    expect(onPay).toHaveBeenCalledWith(expect.objectContaining({ expectedTotalAmount: 45800 }))
  })

  const unknownTotalButtons = () => screen.getAllByRole('button', { name: '결제하기' })

  it('배송비를 계산하는 동안은 배송비·합계를 모르는 값으로 두고 결제를 막는다', async () => {
    const { user } = renderCheckout({ feeQuote: undefined, feeQuoteStatus: 'pending' })
    await user.click(screen.getByLabelText('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요'))
    for (const button of unknownTotalButtons()) expect(button).toBeDisabled()
    expect(screen.getAllByText('배송비를 계산하고 있어요').length).toBeGreaterThan(0)
    // 판매자 2곳 + 배송비 + 총 결제 금액 + 결제 후 잔액 + 하단 바 총액
    expect(screen.getAllByText('배송비 확인 전')).toHaveLength(6)
    expect(screen.queryByText(/NaN|undefined/)).not.toBeInTheDocument()
  })

  it('견적에 실패하면 결제를 막고 다시 불러오게 한다', async () => {
    const onFeeQuoteRetry = vi.fn()
    const { user, onPay } = renderCheckout({
      feeQuote: undefined,
      feeQuoteStatus: 'error',
      onFeeQuoteRetry,
    })
    expect(screen.getByText('배송비를 불러오지 못했어요')).toBeInTheDocument()
    await user.click(screen.getByLabelText('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요'))
    for (const button of unknownTotalButtons()) expect(button).toBeDisabled()
    expect(screen.getAllByText('배송비를 불러오지 못해 결제할 수 없어요').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: '배송비 다시 불러오기' }))
    expect(onFeeQuoteRetry).toHaveBeenCalled()
    expect(onPay).not.toHaveBeenCalled()
  })

  it('금액이 바뀌면(409) 이전 금액과 함께 알린다', () => {
    renderCheckout({ previousTotal: 38800 })

    expect(screen.getByText('주문 금액이 바뀌었어요')).toBeInTheDocument()
    expect(screen.getByText(/38,800원 → 39,800원/)).toBeInTheDocument()
  })
})
