import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { render } from '@/test/render'
import { applications, applyValues } from '../fixtures'
import { SellerApplyView, type SellerApplyViewProps } from './SellerApplyView'
import { SellerStatusView } from './SellerStatusView'

function renderApply(props: Partial<SellerApplyViewProps> = {}) {
  const onSubmit = vi.fn()
  render(
    <MemoryRouter>
      <SellerApplyView onSubmit={onSubmit} {...props} />
    </MemoryRouter>,
  )
  return { onSubmit, user: userEvent.setup() }
}

describe('SellerApplyView', () => {
  it('단계마다 그 단계 칸만 검사하고, 확인 단계에서 신청한다', async () => {
    const { user, onSubmit } = renderApply()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByText('상호명을 입력해 주세요')).toBeInTheDocument()
    expect(screen.getByLabelText('상호명')).toHaveFocus()

    await user.type(screen.getByLabelText('상호명'), applyValues.storeName)
    await user.type(screen.getByLabelText('대표자명'), applyValues.representativeName)
    await user.type(screen.getByLabelText('사업자등록번호'), applyValues.businessNumber)
    await user.type(screen.getByLabelText('통신판매업 신고번호'), applyValues.mailOrderNumber)
    await user.click(screen.getByRole('button', { name: '다음' }))

    await user.type(await screen.findByLabelText('계좌번호'), applyValues.accountNumber)
    await user.type(screen.getByLabelText('예금주'), applyValues.accountHolder)
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByRole('heading', { name: '신청 내용 확인' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '판매자 등록 신청하기' }))
    expect(onSubmit).toHaveBeenCalledWith(applyValues)
  })

  it('사업자번호가 중복이면 1단계로 돌아가 그 칸에 알린다', async () => {
    renderApply({
      defaultValues: applyValues,
      defaultStep: 2,
      serverErrors: { businessNumber: '이미 등록된 사업자등록번호예요' },
    })
    expect(await screen.findByText('이미 등록된 사업자등록번호예요')).toBeVisible()
    expect(screen.getByLabelText('사업자등록번호')).toBeVisible()
  })
})

describe('SellerStatusView', () => {
  it('반려면 사유와 다시 신청하기를 준다', () => {
    render(
      <MemoryRouter>
        <SellerStatusView
          status="success"
          application={applications[SellerApplicationStatus.REJECTED]}
        />
      </MemoryRouter>,
    )
    expect(
      screen.getByText('반려 사유: 통신판매업 신고번호를 확인할 수 없어요'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '다시 신청하기' })).toHaveAttribute(
      'href',
      '/seller/apply?reapply=1',
    )
  })

  it('승인이면 판매자 센터로 이끈다', () => {
    render(
      <MemoryRouter>
        <SellerStatusView
          status="success"
          application={applications[SellerApplicationStatus.APPROVED]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: '판매자 센터로 가기' })).toHaveAttribute(
      'href',
      '/seller',
    )
    // 계좌번호는 가려서 보여 준다
    expect(screen.getByText(/농협은행 301-••••-2191 · 김영수/)).toBeInTheDocument()
  })
})
