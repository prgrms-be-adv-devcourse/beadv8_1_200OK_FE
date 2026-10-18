import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { reviewTarget } from '../fixtures'
import { ReviewWriteView, type ReviewWriteViewProps } from './ReviewWriteView'

function renderWrite(props: Partial<ReviewWriteViewProps> = {}) {
  const onSubmit = vi.fn()
  render(
    <MemoryRouter>
      <ReviewWriteView
        mode="create"
        target={reviewTarget}
        media={[]}
        onAddMedia={() => {}}
        onRemoveMedia={() => {}}
        onSubmit={onSubmit}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onSubmit, user: userEvent.setup() }
}

describe('ReviewWriteView', () => {
  it('누른 별까지 N.0점, 같은 별을 다시 누르면 0.5점을 뺀다', async () => {
    const { user } = renderWrite()
    expect(screen.getByText('별을 눌러 골라 주세요')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '별점 5점' }))
    expect(screen.getByText('5.0점')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '별점 5점' }))
    expect(screen.getByText('4.5점')).toBeInTheDocument()
  })

  it('별점과 10자를 채워야 등록하고, API 값(1~10)으로 넘긴다', async () => {
    const { user, onSubmit } = renderWrite()
    await user.click(screen.getByRole('button', { name: '등록하기' }))

    expect(await screen.findByText('별점을 골라 주세요')).toBeInTheDocument()
    expect(screen.getByText('10자 이상 써 주세요')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '별점 4점' }))
    await user.click(screen.getByRole('button', { name: '별점 4점' }))
    await user.type(screen.getByLabelText('어떤 점이 좋았나요?'), '달고 시원해서 아침마다 마셔요.')
    await user.click(screen.getByRole('button', { name: '등록하기' }))

    expect(onSubmit).toHaveBeenCalledWith({ rating: 7, content: '달고 시원해서 아침마다 마셔요.' })
  })

  it('수정 화면은 삭제 확인을 거친다', async () => {
    const onDelete = vi.fn()
    const { user } = renderWrite({
      mode: 'edit',
      defaultValues: { rating: 9, content: '아삭하고 단맛이 진해요.' },
      onDelete,
    })
    expect(screen.getByText('4.5점')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '삭제' }))
    const dialog = await screen.findByRole('dialog', { name: '리뷰를 삭제할까요?' })
    await user.click(
      [...dialog.querySelectorAll('button')].find((b) => b.textContent === '삭제') as HTMLElement,
    )
    expect(onDelete).toHaveBeenCalled()
  })
})
