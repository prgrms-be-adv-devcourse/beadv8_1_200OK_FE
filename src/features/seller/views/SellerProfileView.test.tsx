import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import {
  followers,
  homeAsOf,
  homeStats,
  myStore,
  productStats,
  sellerWalletBalance,
  todos,
} from '../fixtures'
import { SellerHomeView } from './SellerHomeView'
import { SellerProfileView, type SellerProfileViewProps } from './SellerProfileView'

function renderProfile(props: Partial<SellerProfileViewProps> = {}) {
  const handlers = { onSave: vi.fn(), onPhotoChange: vi.fn(), onPhotoRemove: vi.fn() }
  render(
    <MemoryRouter>
      <SellerProfileView
        status="success"
        profile={myStore}
        followers={followers}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('SellerProfileView', () => {
  it('연락처 형식을 검사하고 저장한다', async () => {
    const { user, onSave } = renderProfile()
    const phone = screen.getByLabelText('고객센터 연락처')
    await user.clear(phone)
    await user.type(phone, '0548732210')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(
      await screen.findByText('연락처를 054-873-2210 형식으로 입력해 주세요'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()

    await user.clear(phone)
    await user.type(phone, '054-873-2210')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith({
      storeName: '청송 햇살농원',
      representativeName: '김영수',
      customerServicePhone: '054-873-2210',
      introduction: '3대째 사과만 키우는 청송 부남면 과수원이에요.',
    })
  })

  it('10MB를 넘는 사진은 올리지 않고 알린다', async () => {
    const { user, onPhotoChange } = renderProfile()
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, big)
    expect(screen.getByText('사진은 10MB 이하로 올려 주세요')).toBeInTheDocument()
    expect(onPhotoChange).not.toHaveBeenCalled()
  })

  it('팔로워가 없으면 빈 상태', () => {
    renderProfile({ followers: [] })
    expect(screen.getByText('아직 팔로워가 없어요')).toBeInTheDocument()
  })
})

describe('SellerHomeView', () => {
  it('취소 요청이 걸린 주문은 송장 등록 대신 취소 요청 처리로 보낸다', () => {
    render(
      <MemoryRouter>
        <SellerHomeView
          status="success"
          asOf={homeAsOf}
          stats={homeStats}
          todos={todos}
          walletBalance={sellerWalletBalance}
          products={productStats}
        />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link', { name: '취소 요청 처리' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: '송장 등록' })).toHaveLength(3)
    expect(screen.getByText('확인 필요')).toBeInTheDocument()
  })
})
