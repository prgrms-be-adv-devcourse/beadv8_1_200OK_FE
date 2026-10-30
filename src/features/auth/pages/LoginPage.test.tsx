import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, getAuthSession } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { LoginPage } from './LoginPage'

function renderLogin() {
  const router = createMemoryRouter(
    [
      { path: '/login', Component: LoginPage },
      { path: '/cart', element: <h1>장바구니</h1> },
    ],
    { initialEntries: ['/login?returnTo=%2Fcart'] },
  )
  render(<RouterProvider router={router} />)
  return { router, user: userEvent.setup() }
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('아이디'), 'tester01')
  await user.type(screen.getByLabelText('비밀번호'), 'password1!')
  await user.click(screen.getByRole('button', { name: '로그인' }))
}

afterEach(() => clearAccessToken())

describe('LoginPage', () => {
  it('로그인하면 토큰의 역할로 세션을 만들고 돌아갈 곳으로 간다', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json({
          tokenType: 'Bearer',
          accessToken: fakeToken({ memberId: 7, role: MemberRole.SELLER }),
          accessTokenExpiresAt: '2026-10-18T12:00:00Z',
          refreshToken: 'r',
          refreshTokenExpiresAt: '2026-11-01T12:00:00Z',
        }),
      ),
    )
    const { router, user } = renderLogin()
    await submit(user)
    expect(await screen.findByRole('heading', { name: '장바구니' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/cart')
    expect(getAuthSession()).toMatchObject({ memberId: 7, role: MemberRole.SELLER })
  })

  it('아이디·비밀번호가 틀리면(401) 서버 문구를 보여 주고 머문다', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Unauthorized',
            status: 401,
            detail: '아이디 또는 비밀번호가 올바르지 않습니다.',
            instance: '/api/v1/auth/login',
          },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    const { router, user } = renderLogin()
    await submit(user)
    expect(await screen.findByText('아이디 또는 비밀번호가 올바르지 않습니다.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(getAuthSession()).toBeNull()
  })
})
