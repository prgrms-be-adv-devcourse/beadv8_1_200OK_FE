import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { NOT_CONNECTED_REASON } from '@/shared/ui'
import { render } from '@/test/render'
import { sellerWallet, sellerWalletTxs, withdrawals } from '../fixtures'
import { SellerWalletView, type SellerWalletViewProps } from './SellerWalletView'

function renderWallet(props: Partial<SellerWalletViewProps> = {}) {
  const handlers = { onWithdraw: vi.fn(), onRequestAccountChange: vi.fn() }
  render(
    <MemoryRouter>
      <SellerWalletView
        status="success"
        wallet={sellerWallet}
        withdrawals={withdrawals}
        transactions={sellerWalletTxs}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

const requestButton = () => screen.getByRole('button', { name: '출금 신청' })

describe('SellerWalletView', () => {
  it('금액을 넣기 전에는 출금 신청을 막고 이유를 보여 준다', () => {
    renderWallet()
    expect(requestButton()).toBeDisabled()
    expect(requestButton()).toHaveAccessibleDescription('출금할 금액을 입력해 주세요')
  })

  it('최소 금액·출금 가능 금액을 넘는 금액은 오류로 알려 준다', async () => {
    const { user } = renderWallet()
    const input = screen.getByLabelText('출금할 금액')
    await user.type(input, '5000')
    expect(screen.getByText('10,000원 이상 입력해 주세요')).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, '900000')
    expect(
      screen.getByText('출금 가능 금액(886,420원)보다 많아요. 전액 버튼을 눌러 보세요'),
    ).toBeInTheDocument()
    expect(requestButton()).toBeDisabled()
  })

  it('전액 → 확인 모달 → 출금 신청', async () => {
    const { user, onWithdraw } = renderWallet()
    await user.click(screen.getByRole('button', { name: '전액' }))
    await user.click(requestButton())
    const dialog = await screen.findByRole('dialog', { name: '886,420원을 출금할까요?' })
    expect(dialog).toHaveTextContent('신청 후 출금 가능 금액0원')
    await user.click(within(dialog).getByRole('button', { name: '출금 신청' }))
    expect(onWithdraw).toHaveBeenCalledWith(886420)
  })

  it('계좌 확인이 필요하면 입력을 막고 변경 요청으로 안내한다', () => {
    renderWallet({ wallet: { ...sellerWallet, accountNeedsCheck: true } })
    expect(screen.getByLabelText('출금할 금액')).toBeDisabled()
    expect(requestButton()).toHaveAccessibleDescription('등록 계좌를 확인한 뒤 출금할 수 있어요')
    expect(screen.getByRole('button', { name: '계좌 변경 요청하기' })).toBeInTheDocument()
  })

  it('계좌·내역이 연결 전(null)이면 그 칸을 연결 전으로 보여 주고 출금·계좌 변경을 막는다', () => {
    renderWallet({
      wallet: { ...sellerWallet, account: null, withdrawableAmount: sellerWallet.balance },
      withdrawals: null,
      transactions: null,
      featureDisabledReason: NOT_CONNECTED_REASON,
    })
    expect(screen.getByText('정산 계좌는 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.getByText('출금 내역은 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.getByText('입출금 내역은 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.queryByText('아직 출금한 내역이 없어요')).not.toBeInTheDocument()
    expect(screen.queryByText('아직 입출금 내역이 없어요')).not.toBeInTheDocument()
    expect(screen.getByLabelText('출금할 금액')).toBeDisabled()
    expect(requestButton()).toBeDisabled()
    expect(requestButton()).toHaveAccessibleDescription(NOT_CONNECTED_REASON)
    expect(screen.queryByRole('button', { name: '계좌 변경 요청' })).not.toBeInTheDocument()
  })

  it('기능이 막혀 있으면 계좌 변경 요청도 이유와 함께 막는다', () => {
    renderWallet({ featureDisabledReason: NOT_CONNECTED_REASON })
    const change = screen.getByRole('button', { name: '계좌 변경 요청' })
    expect(change).toBeDisabled()
    expect(change).toHaveAccessibleDescription(NOT_CONNECTED_REASON)
  })

  it('계좌 변경 요청은 은행·계좌번호·예금주가 있어야 보낸다', async () => {
    const { user, onRequestAccountChange } = renderWallet({ defaultModal: 'account' })
    const dialog = await screen.findByRole('dialog', { name: '정산 계좌 변경 요청' })
    await user.click(within(dialog).getByRole('button', { name: '변경 요청 보내기' }))
    expect(within(dialog).getByText('은행을 골라 주세요')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('은행')).toHaveFocus()
    expect(onRequestAccountChange).not.toHaveBeenCalled()

    await user.selectOptions(within(dialog).getByLabelText('은행'), '국민은행')
    await user.type(within(dialog).getByLabelText('계좌번호'), '123-456-789012')
    await user.type(within(dialog).getByLabelText('예금주'), '김영수')
    await user.click(within(dialog).getByRole('button', { name: '변경 요청 보내기' }))
    expect(onRequestAccountChange).toHaveBeenCalledWith({
      bankName: '국민은행',
      accountNumber: '123-456-789012',
      holder: '김영수',
      reason: '',
    })
  })
})
