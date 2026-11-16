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

  it('연락처는 숫자 9~11자리를 받고 하이픈을 붙여 넘긴다', async () => {
    openPostcode.mockImplementation(async (onPick) =>
      onPick({ zipCode: '04524', address: '서울 중구 세종대로 110' }),
    )
    const { user, onSave } = renderModal()

    await user.type(await screen.findByLabelText('받는 분'), '이서연')
    await user.type(screen.getByLabelText('연락처'), '021234567')
    await user.click(screen.getByRole('button', { name: '우편번호 찾기' }))
    await user.type(screen.getByLabelText('상세주소'), '3층')
    await user.click(screen.getByRole('button', { name: '이번 주문에 적용' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ recipientPhone: '02-123-4567' }))
  })

  it.each(['01234567', '010123456789', '010--1234-5678'])(
    '연락처가 숫자 9~11자리가 아니면(%s) 막는다',
    async (phone) => {
      const { user, onSave } = renderModal()
      await user.type(await screen.findByLabelText('연락처'), phone)
      await user.click(screen.getByRole('button', { name: '이번 주문에 적용' }))

      expect(onSave).not.toHaveBeenCalled()
      expect(await screen.findByText('연락처를 숫자 9~11자리로 입력해 주세요')).toBeInTheDocument()
    },
  )

  it('주소를 안 고르면 우편번호 찾기를 안내한다', async () => {
    const { user, onSave } = renderModal()
    await user.click(await screen.findByRole('button', { name: '이번 주문에 적용' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(
      (await screen.findAllByText('우편번호 찾기로 주소를 골라 주세요')).length,
    ).toBeGreaterThan(0)
  })

  it('상세주소를 비우면 저장하지 않고 칸 오류를 보여 준다', async () => {
    openPostcode.mockImplementation(async (onPick) =>
      onPick({ zipCode: '04524', address: '서울 중구 세종대로 110' }),
    )
    const { user, onSave } = renderModal()
    await user.type(await screen.findByLabelText('받는 분'), '이서연')
    await user.type(screen.getByLabelText('연락처'), '010-2468-1357')
    await user.click(screen.getByRole('button', { name: '우편번호 찾기' }))
    await user.type(screen.getByLabelText('상세주소'), '   ')
    await user.click(screen.getByRole('button', { name: '이번 주문에 적용' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(await screen.findByText('상세주소를 입력해 주세요')).toBeInTheDocument()
    expect(screen.getByLabelText('상세주소')).toHaveFocus()
    expect(screen.getByLabelText('상세주소')).toHaveAttribute('aria-invalid', 'true')
  })

  it('서비스를 못 불러오면 다시 누르라고 알린다', async () => {
    openPostcode.mockRejectedValue(new Error('fail'))
    const { user } = renderModal()
    await user.click(await screen.findByRole('button', { name: '우편번호 찾기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('주소 검색을 불러오지 못했어요')
  })
})
