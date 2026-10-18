import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { MY_BALANCE, myAddress, myProfile } from '../fixtures'
import { WithdrawReason } from '../types'
import { AccountView, type AccountViewProps } from './AccountView'

function renderAccount(props: Partial<AccountViewProps> = {}) {
  const handlers = {
    onTabChange: vi.fn(),
    onSaveInfo: vi.fn(),
    onChangePassword: vi.fn(),
    onSaveAddress: vi.fn(),
    onDeleteAddress: vi.fn(),
    onWithdraw: vi.fn(),
  }
  render(
    <MemoryRouter>
      <AccountView
        tab="info"
        profile={myProfile}
        address={myAddress}
        balance={MY_BALANCE}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('AccountView', () => {
  it('아이디·이메일은 바꿀 수 없고 이름·닉네임을 저장한다', async () => {
    const { user, onSaveInfo } = renderAccount()
    expect(screen.getByLabelText('아이디')).toHaveAttribute('readonly')

    const nickname = screen.getByLabelText('닉네임')
    await user.clear(nickname)
    await user.type(nickname, '아침사과')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onSaveInfo).toHaveBeenCalledWith({ name: '이서연', nickname: '아침사과' })
  })

  it('현재 비밀번호가 틀리면 그 칸에 알린다', async () => {
    renderAccount({
      tab: 'password',
      passwordErrors: { currentPassword: '현재 비밀번호가 맞지 않아요' },
    })
    expect(await screen.findByText('현재 비밀번호가 맞지 않아요')).toBeInTheDocument()
    expect(screen.getByLabelText('현재 비밀번호')).toHaveAccessibleDescription(
      expect.stringContaining('현재 비밀번호가 맞지 않아요'),
    )
  })

  it('예치금이 남아 있으면 탈퇴를 막는다', () => {
    renderAccount({ tab: 'withdraw', withdrawBlock: 'balance' })
    expect(screen.getByText('예치금 128,000원이 남아 있어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '탈퇴 신청' })).toBeDisabled()
  })

  it('사유·확인을 거쳐 탈퇴를 신청한다', async () => {
    const { user, onWithdraw } = renderAccount({ tab: 'withdraw', balance: 0 })
    await user.selectOptions(screen.getByLabelText('탈퇴 사유'), '자주 이용하지 않아요')
    await user.click(screen.getByLabelText('유의사항을 모두 확인했어요'))
    await user.click(screen.getByRole('button', { name: '탈퇴 신청' }))

    const dialog = await screen.findByRole('dialog', { name: '정말 탈퇴할까요?' })
    await user.click(
      [...dialog.querySelectorAll('button')].find(
        (b) => b.textContent === '탈퇴 신청',
      ) as HTMLElement,
    )
    expect(onWithdraw).toHaveBeenCalledWith(WithdrawReason.RARELY_USED)
  })

  it('배송지가 없으면 등록하게 한다', () => {
    renderAccount({ tab: 'address', address: null })
    expect(screen.getByText('저장된 배송지가 없어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '배송지 등록' })).toBeInTheDocument()
  })
})
