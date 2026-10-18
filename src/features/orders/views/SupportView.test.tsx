import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { inquiries, inquiryTargets } from '../fixtures'
import { InquiryType } from '../types'
import { SupportView, type SupportViewProps } from './SupportView'

function renderSupport(props: Partial<SupportViewProps> = {}) {
  const onSubmit = vi.fn()
  render(
    <MemoryRouter>
      <SupportView
        orderId={93}
        targets={inquiryTargets}
        inquiries={inquiries}
        photos={[]}
        onAddPhotos={() => {}}
        onRemovePhoto={() => {}}
        onSubmit={onSubmit}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onSubmit, user: userEvent.setup() }
}

describe('SupportView', () => {
  it('유형과 10자 이상 내용으로 문의를 보낸다', async () => {
    const { user, onSubmit } = renderSupport()
    await user.click(screen.getByRole('radio', { name: '오배송·수량 누락' }))
    await user.type(screen.getByLabelText('내용'), '5kg을 주문했는데 3kg만 왔어요.')
    await user.click(screen.getByRole('button', { name: '문의 보내기' }))

    expect(onSubmit).toHaveBeenCalledWith({
      orderItemId: 931,
      type: InquiryType.WRONG_ITEM,
      content: '5kg을 주문했는데 3kg만 왔어요.',
    })
  })

  it('사진을 올리는 중이면 보내기를 막는다', () => {
    renderSupport({ photos: [{ id: 'a', url: '', progress: 30 }] })
    expect(screen.getByRole('button', { name: '문의 보내기' })).toBeDisabled()
    expect(screen.getByText('사진을 다 올린 뒤 보낼 수 있어요')).toBeInTheDocument()
  })
})
