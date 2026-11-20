import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { problem } from '@/mocks/handlers/_shared'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { FarmPage } from './FarmPage'

// /farms/:farmId = 판매자 상점. 기본 응답(mocks/handlers/farms.ts): 7·8번 상점만 있고 나머지는 404.
// 상점 머리만 서버 응답으로 그리고, 판매자별 상품·팔로우·팔로워 수는 API가 없어 ‘연결 전’이다.

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '/farms/:farmId', Component: FarmPage }], {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
}

afterEach(() => clearAccessToken())

describe('FarmPage', () => {
  it('상점 프로필(상호·대표자·고객센터·소개)을 그리고, 상품·팔로우는 연결 전으로 둔다', async () => {
    renderAt('/farms/7')

    expect(
      await screen.findByRole('heading', { level: 1, name: '청송 햇살농원' }),
    ).toBeInTheDocument()
    expect(screen.getByText('김영수')).toBeInTheDocument()
    expect(screen.getByText('054-873-2210')).toBeInTheDocument()
    expect(screen.getByText('3대째 사과만 키우는 청송 부남면 과수원이에요.')).toBeInTheDocument()

    // 팔로우 API가 없어 막고 이유를 보인다. 팔로워 수는 모르는 값(‘–’)
    expect(screen.getByRole('button', { name: '팔로우' })).toBeDisabled()
    expect(screen.getAllByText('연결 전').length).toBeGreaterThan(0)
    // 판매자별 상품 목록 API가 없어 가짜 상품 대신 안내한다
    const products = screen.getByRole('region', { name: /판매 중인 상품/ })
    expect(
      within(products).getByText('판매 중인 상품은 아직 연결되지 않았어요'),
    ).toBeInTheDocument()
    expect(within(products).queryByRole('link', { name: /원/ })).not.toBeInTheDocument()
  })

  it('소개·사진이 없으면 소개 줄을 빼고 상호 첫 글자를 보인다', async () => {
    server.use(
      http.get('*/api/v1/stores/:sellerId', () =>
        HttpResponse.json({
          sellerId: 9,
          storeName: '산골벌꿀',
          representativeName: '이산골',
          customerServicePhone: '1588-1234',
          introduction: null,
          profileImageUrl: null,
        }),
      ),
    )
    renderAt('/farms/9')

    expect(await screen.findByRole('heading', { level: 1, name: '산골벌꿀' })).toBeInTheDocument()
    expect(screen.getByText('산')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('로그인한 판매자 본인의 상점이면 팔로우 대신 프로필 수정으로 보낸다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.SELLER, memberId: 7 }))
    renderAt('/farms/7')

    expect(await screen.findByRole('link', { name: '상점 프로필 수정' })).toHaveAttribute(
      'href',
      '/seller/profile',
    )
    expect(screen.queryByRole('button', { name: '팔로우' })).not.toBeInTheDocument()
  })

  it('상점 프로필이 없으면(404) 상점을 찾을 수 없다고 알린다', async () => {
    renderAt('/farms/999')

    expect(await screen.findByText('상점을 찾을 수 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /다시/ })).not.toBeInTheDocument()
  })

  it('숫자가 아닌 번호는 서버를 부르지 않고 찾을 수 없다고 알린다', async () => {
    let called = false
    server.use(
      http.get('*/api/v1/stores/:sellerId', () => {
        called = true
        return HttpResponse.json({})
      }),
    )
    renderAt('/farms/abc')

    expect(await screen.findByText('상점을 찾을 수 없어요')).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('불러오지 못하면 서버 안내와 다시 시도를 보이고, 다시 시도하면 상점을 그린다', async () => {
    let fail = true
    server.use(
      http.get('*/api/v1/stores/:sellerId', () =>
        fail
          ? problem(500, '서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요')
          : HttpResponse.json({
              sellerId: 7,
              storeName: '청송 햇살농원',
              representativeName: '김영수',
              customerServicePhone: '054-873-2210',
              introduction: null,
              profileImageUrl: null,
            }),
      ),
    )
    renderAt('/farms/7')

    expect(
      await screen.findByText(
        '서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: /다시 시도/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: '청송 햇살농원' }),
    ).toBeInTheDocument()
  })

  it('서버에 경로가 아직 없을 때의 404는 상점 없음이 아니라 해요체 오류로 바꿔 보인다', async () => {
    server.use(
      http.get('*/api/v1/stores/:sellerId', () =>
        problem(404, 'No static resource api/v1/stores/7.'),
      ),
    )
    renderAt('/farms/7')

    expect(
      await screen.findByText('지금은 상점 정보를 볼 수 없어요. 잠시 뒤 다시 시도해 주세요.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/No static resource/)).not.toBeInTheDocument()
    expect(screen.queryByText('상점을 찾을 수 없어요')).not.toBeInTheDocument()
  })
})
