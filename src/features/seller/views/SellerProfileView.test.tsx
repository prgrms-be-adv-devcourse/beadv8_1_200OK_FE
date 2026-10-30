import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import {
  followers,
  homeAsOf,
  homeStats,
  myProfile,
  myStore,
  payoutOutlook,
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
        profile={myProfile}
        sellerId={myStore.sellerId}
        followerCount={myStore.followerCount}
        photoUrl={null}
        followers={followers}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('SellerProfileView', () => {
  it('연락처 형식(지역번호 또는 1588-1234)을 검사하고 저장한다', async () => {
    const { user, onSave } = renderProfile()
    const phone = screen.getByLabelText('고객센터 연락처')
    await user.clear(phone)
    await user.type(phone, '0548732210')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(
      await screen.findByText('연락처를 054-873-2210 또는 1588-1234 형식으로 입력해 주세요'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()

    await user.clear(phone)
    await user.type(phone, '1588-1234')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith({
      storeName: '청송 햇살농원',
      representativeName: '김영수',
      customerServicePhone: '1588-1234',
      introduction: '3대째 사과만 키우는 청송 부남면 과수원이에요.',
    })
  })

  it('등록 전(null)이면 빈 폼과 ‘등록’ 버튼, 상점 링크·팔로워는 숨긴다', () => {
    renderProfile({ profile: null, followerCount: 0, followers: [] })
    expect(screen.getByText(/상점 프로필을 등록하면 구매자에게 상점이 보여요/)).toBeInTheDocument()
    expect(screen.getByLabelText('상호명')).toHaveValue('')
    expect(screen.getByRole('button', { name: '등록' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: '구매자에게 보이는 상점 보기' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('팔로워')).not.toBeInTheDocument()
  })

  it('사진을 올리는 중에는 저장을 막고 이유를 보여 준다', () => {
    renderProfile({ uploading: true, photoUploading: true, photoUrl: 'blob:preview' })
    const save = screen.getByRole('button', { name: '저장' })
    expect(save).toBeDisabled()
    expect(save).toHaveAccessibleDescription('사진을 다 올린 뒤 저장할 수 있어요')
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

  it('팔로워가 연결 전(null)이면 수는 ‘–’, 목록은 연결 전 안내 (빈 상태 문구를 쓰지 않는다)', () => {
    renderProfile({ followerCount: null, followers: null })
    expect(screen.getByText('팔로워는 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.getByText('연결 전')).toBeInTheDocument()
    expect(screen.queryByText('아직 팔로워가 없어요')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '팔로워 더 보기' })).not.toBeInTheDocument()
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
          expectedPayout={payoutOutlook.expectedAmount}
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

  it('주문 집계·처리할 일이 연결 전(null)이면 건수는 ‘–’, 처리할 일은 연결 전 안내', () => {
    render(
      <MemoryRouter>
        <SellerHomeView
          status="success"
          stats={null}
          expectedPayout={null}
          todos={null}
          walletBalance={sellerWalletBalance}
          products={productStats}
        />
      </MemoryRouter>,
    )
    const summary = screen.getByRole('region', { name: '오늘 요약' })
    expect(within(summary).getAllByText('연결 전')).toHaveLength(3)
    expect(within(summary).getByText('불러오지 못했어요')).toBeInTheDocument()
    expect(screen.getByText('처리할 일은 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.queryByText('오늘 처리할 일이 없어요')).not.toBeInTheDocument()
    expect(screen.queryByText('확인 필요')).not.toBeInTheDocument()
    expect(screen.queryByText(/기준$/)).not.toBeInTheDocument()
  })
})
