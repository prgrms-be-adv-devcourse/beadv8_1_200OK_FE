import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { render } from '@/test/render'
import { applicationDetail, applicationHistory, applications, applyValues } from '../fixtures'
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
  it('상점 정보 칸을 검사한 뒤 확인 단계에서 신청한다 (정산 계좌 단계 없음)', async () => {
    const { user, onSubmit } = renderApply()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByText('상호명을 입력해 주세요')).toBeInTheDocument()
    expect(screen.getByLabelText('상호명')).toHaveFocus()

    await user.type(screen.getByLabelText('상호명'), applyValues.storeName)
    await user.type(screen.getByLabelText('대표자명'), applyValues.representativeName)
    await user.type(screen.getByLabelText('사업자등록번호'), '5128104273')
    await user.type(screen.getByLabelText('통신판매업 신고번호'), applyValues.mailOrderNumber)
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByRole('heading', { name: '신청 내용 확인' })).toBeInTheDocument()
    expect(screen.queryByLabelText('계좌번호')).not.toBeInTheDocument()
    expect(screen.getByText(/정산 계좌는 승인 뒤 지갑에서 등록해요/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '판매자 등록 신청하기' }))
    expect(onSubmit).toHaveBeenCalledWith({ ...applyValues, businessNumber: '5128104273' })
  })

  it('사업자번호가 중복이면 1단계로 돌아가 그 칸에 알린다', async () => {
    renderApply({
      defaultValues: applyValues,
      defaultStep: 1,
      serverErrors: { businessNumber: '이미 신청된 사업자등록번호입니다.' },
    })
    expect(await screen.findByText('이미 신청된 사업자등록번호입니다.')).toBeVisible()
    expect(screen.getByLabelText('사업자등록번호')).toBeVisible()
  })
})

describe('SellerStatusView', () => {
  const renderStatus = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

  it('반려면 사유와 다시 신청하기를 준다', () => {
    renderStatus(
      <SellerStatusView
        status="success"
        application={applications[SellerApplicationStatus.REJECTED]}
        detail={applicationDetail}
      />,
    )
    expect(
      screen.getByText('반려 사유: 통신판매업 신고번호를 확인할 수 없어요'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '다시 신청하기' })).toHaveAttribute(
      'href',
      '/seller/apply?reapply=1',
    )
  })

  it('승인이면 판매자 센터로 이끌고, 권한을 아직 못 받았으면 권한 받기 버튼을 준다', () => {
    const onGrant = vi.fn()
    const { rerender } = renderStatus(
      <SellerStatusView
        status="success"
        application={applications[SellerApplicationStatus.APPROVED]}
        detail={applicationDetail}
      />,
    )
    expect(screen.getByRole('link', { name: '판매자 센터로 가기' })).toHaveAttribute(
      'href',
      '/seller',
    )
    expect(screen.getByText('512-81-04273')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <SellerStatusView
          status="success"
          application={applications[SellerApplicationStatus.APPROVED]}
          detail={applicationDetail}
          grantSeller={{ onGrant, granting: false, error: '로그인이 필요해요' }}
        />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link', { name: '판매자 센터로 가기' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('로그인이 필요해요')
    screen.getByRole('button', { name: '판매자 권한 받기' }).click()
    expect(onGrant).toHaveBeenCalled()
  })

  it('이전 신청은 상태 배지와 반려 사유로 보여 준다', () => {
    renderStatus(
      <SellerStatusView
        status="success"
        application={applicationHistory[0]}
        detail={applicationDetail}
        history={applicationHistory.slice(1)}
      />,
    )
    expect(screen.getByRole('heading', { name: '이전 신청' })).toBeInTheDocument()
    expect(
      screen.getByText('반려 사유: 통신판매업 신고번호를 확인할 수 없어요'),
    ).toBeInTheDocument()
  })
})
