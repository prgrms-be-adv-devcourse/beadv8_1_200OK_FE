import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, getAuthSession, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { applicationDetail, applications, applyValues } from '../fixtures'
import { SellerApplyPage, SellerStatusPage } from './SellerApplyPages'

const S = SellerApplicationStatus

const problem = (status: number, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

const history = (...items: (typeof applications)[SellerApplicationStatus][]) =>
  http.get('*/api/v1/sellers/me/applications', () => HttpResponse.json({ applications: items }))

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/seller/apply', Component: SellerApplyPage },
      { path: '/seller/apply/status', Component: SellerStatusPage },
      { path: '/seller', element: <h1>판매자 센터</h1> },
      { path: '/login', element: <h1>로그인</h1> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return { router, user: userEvent.setup() }
}

async function fillShop(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('상호명'), applyValues.storeName)
  await user.type(screen.getByLabelText('대표자명'), applyValues.representativeName)
  await user.type(screen.getByLabelText('사업자등록번호'), '5128104273')
  await user.type(screen.getByLabelText('통신판매업 신고번호'), applyValues.mailOrderNumber)
  await user.click(screen.getByRole('button', { name: '다음' }))
  await screen.findByRole('heading', { name: '신청 내용 확인' })
}

beforeEach(() => setAccessToken(fakeToken({ memberId: 2, role: MemberRole.BUYER })))
afterEach(() => clearAccessToken())

describe('SellerApplyPage', () => {
  it('사업자등록번호를 000-00-00000으로 맞춰 POST하고 완료 화면을 보여 준다', async () => {
    let body: unknown
    server.use(
      http.post('*/api/v1/sellers/me/applications', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ applicationId: 31 }, { status: 201 })
      }),
    )
    const { user } = renderAt('/seller/apply')
    await fillShop(user)
    await user.click(screen.getByRole('button', { name: '판매자 등록 신청하기' }))

    expect(await screen.findByRole('status')).toHaveTextContent('판매자 등록을 신청했어요')
    expect(body).toEqual({ ...applyValues, businessNumber: '512-81-04273' })
    expect(screen.getByText('512-81-04273')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '신청 현황 보기' })).toHaveAttribute(
      'href',
      '/seller/apply/status',
    )
  })

  it('409 사업자등록번호 중복은 그 칸에, 409 진행 중인 신청은 폼 위 문구로', async () => {
    server.use(
      http.post('*/api/v1/sellers/me/applications', () =>
        problem(409, '이미 신청된 사업자등록번호입니다.'),
      ),
    )
    const { user } = renderAt('/seller/apply')
    await fillShop(user)
    await user.click(screen.getByRole('button', { name: '판매자 등록 신청하기' }))

    expect(await screen.findByText('이미 신청된 사업자등록번호입니다.')).toBeVisible()
    expect(screen.getByLabelText('사업자등록번호')).toHaveFocus()

    server.use(
      http.post('*/api/v1/sellers/me/applications', () =>
        problem(409, '심사 중인 판매자 신청이 있습니다.'),
      ),
    )
    await user.clear(screen.getByLabelText('사업자등록번호'))
    await user.type(screen.getByLabelText('사업자등록번호'), '512-81-04274')
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(await screen.findByRole('button', { name: '판매자 등록 신청하기' }))
    expect(await screen.findByText('심사 중인 판매자 신청이 있습니다.')).toBeInTheDocument()
    expect(screen.getByText('신청이 아직 접수되지 않았어요')).toBeInTheDocument()
  })

  it('진행 중인 신청(PENDING)이 있으면 신청 현황으로 보낸다', async () => {
    server.use(history(applications[S.PENDING]))
    const { router } = renderAt('/seller/apply')
    await waitFor(() => expect(router.state.location.pathname).toBe('/seller/apply/status'))
    expect(await screen.findByText('신청이 접수됐어요')).toBeInTheDocument()
  })

  it('반려 뒤 ?reapply=1 이면 전 신청 내용과 반려 사유를 채운다', async () => {
    server.use(history(applications[S.REJECTED]))
    renderAt('/seller/apply?reapply=1')
    expect(await screen.findByLabelText('상호명')).toHaveValue(applicationDetail.storeName)
    expect(screen.getByLabelText('사업자등록번호')).toHaveValue(applicationDetail.businessNumber)
    expect(screen.getByLabelText('통신판매업 신고번호')).toHaveValue('')
    expect(
      screen.getByText('반려 사유: 통신판매업 신고번호를 확인할 수 없어요'),
    ).toBeInTheDocument()
  })
})

describe('SellerStatusPage', () => {
  it('신청한 적 없으면 신청하기로 안내한다', async () => {
    renderAt('/seller/apply/status')
    expect(await screen.findByText('아직 판매자 신청을 하지 않았어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '판매자 신청하기' })).toHaveAttribute(
      'href',
      '/seller/apply',
    )
  })

  it('반려면 사유와 다시 신청하기, 신청 정보 장부를 보여 준다', async () => {
    server.use(history(applications[S.REJECTED]))
    renderAt('/seller/apply/status')
    expect(await screen.findByRole('link', { name: '다시 신청하기' })).toHaveAttribute(
      'href',
      '/seller/apply?reapply=1',
    )
    expect(await screen.findByText(applicationDetail.businessNumber)).toBeInTheDocument()
  })

  it('승인됐는데 토큰이 BUYER면 재발급으로 SELLER 권한을 받고 판매자 센터로 간다', async () => {
    let reissueBody: unknown
    server.use(
      history(applications[S.APPROVED]),
      http.post('*/api/v1/auth/reissue', async ({ request }) => {
        reissueBody = await request.json()
        return HttpResponse.json({
          tokenType: 'Bearer',
          accessToken: fakeToken({ memberId: 2, role: MemberRole.SELLER }),
          accessTokenExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          refreshToken: 'refresh-seller',
          refreshTokenExpiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        })
      }),
    )
    setAccessToken(fakeToken({ memberId: 2, role: MemberRole.BUYER }), 'refresh-buyer')
    const { router } = renderAt('/seller/apply/status')

    expect(await screen.findByRole('heading', { name: '판매자 센터' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/seller')
    expect(reissueBody).toEqual({ refreshToken: 'refresh-buyer' })
    expect(getAuthSession()?.role).toBe(MemberRole.SELLER)
  })

  it('재발급이 실패하면 세션을 끝내고(가드가 로그인으로 보낸다) 이유를 보여 준다', async () => {
    server.use(
      history(applications[S.APPROVED]),
      http.post('*/api/v1/auth/reissue', () => problem(401, '다시 로그인해 주세요.')),
    )
    setAccessToken(fakeToken({ memberId: 2, role: MemberRole.BUYER }), 'refresh-buyer')
    renderAt('/seller/apply/status')

    expect(await screen.findByText('다시 로그인해 주세요.')).toBeInTheDocument()
    expect(screen.getByText('권한을 받지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '판매자 권한 받기' })).toBeInTheDocument()
    expect(getAuthSession()).toBeNull()
  })
})
