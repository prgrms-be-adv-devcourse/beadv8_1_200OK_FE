import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { AddressModal } from './AddressModal'

const openPostcode = vi.hoisted(() => vi.fn())
vi.mock('@/shared/lib/daumPostcode', () => ({ openPostcode }))

function renderModal() {
  const onSave = vi.fn()
  render(<AddressModal opened onClose={() => {}} onSave={onSave} />)
  return { onSave, user: userEvent.setup() }
}

describe('AddressModal', () => {
  it('우편번호 찾기로 고른 주소를 채우고 상세주소로 focus한다', async () => {
    openPostcode.mockImplementation(async (onPick) =>
      onPick({ zipCode: '04524', address: '서울 중구 세종대로 110' }),
    )
    const { user, onSave } = renderModal()

    await user.type(await screen.findByLabelText('받는 분'), '이서연')
    await user.type(screen.getByLabelText('연락처'), '010-2468-1357')
    await user.click(screen.getByRole('button', { name: '우편번호 찾기' }))

    expect(screen.getByLabelText('우편번호')).toHaveValue('04524')
    expect(screen.getByLabelText('주소')).toHaveValue('서울 중구 세종대로 110')
    expect(screen.getByLabelText('상세주소')).toHaveFocus()

    await user.type(screen.getByLabelText('상세주소'), '3층')
    await user.click(screen.getByRole('button', { name: '이번 주문에 적용' }))
    expect(onSave).toHaveBeenCalledWith({
      recipientName: '이서연',
      recipientPhone: '010-2468-1357',
      zipCode: '04524',
      address: '서울 중구 세종대로 110',
      addressDetail: '3층',
    })
  })

  it('주소를 안 고르면 우편번호 찾기를 안내한다', async () => {
    const { user, onSave } = renderModal()
    await user.click(await screen.findByRole('button', { name: '이번 주문에 적용' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(
      (await screen.findAllByText('우편번호 찾기로 주소를 골라 주세요')).length,
    ).toBeGreaterThan(0)
  })

  it('서비스를 못 불러오면 다시 누르라고 알린다', async () => {
    openPostcode.mockRejectedValue(new Error('fail'))
    const { user } = renderModal()
    await user.click(await screen.findByRole('button', { name: '우편번호 찾기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('주소 검색을 불러오지 못했어요')
  })
})
