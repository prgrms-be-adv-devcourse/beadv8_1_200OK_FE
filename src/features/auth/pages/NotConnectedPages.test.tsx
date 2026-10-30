import { screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { render } from '@/test/render'
import { FindAccountPage } from './FindAccountPage'
import { ResetPasswordPage } from './ResetPasswordPage'

// 아이디 찾기·비밀번호 재설정 API가 없어(C-5) 두 라우트는 ‘연결 전’만 보여 준다

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/find-account', Component: FindAccountPage },
      { path: '/find-account/reset', Component: ResetPasswordPage },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

describe('계정 찾기 (연결 전)', () => {
  it('아이디·비밀번호 찾기는 폼 대신 연결 전 안내와 로그인 링크를 보여 준다', async () => {
    renderAt('/find-account?tab=password')
    expect(
      await screen.findByRole('heading', { level: 1, name: '아이디·비밀번호 찾기' }),
    ).toBeInTheDocument()
    expect(screen.getByText('아이디·비밀번호 찾기는 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인으로' })).toHaveAttribute('href', '/login')
  })

  it('비밀번호 재설정은 폼 대신 연결 전 안내를 보여 준다', async () => {
    renderAt('/find-account/reset?token=abc')
    expect(
      await screen.findByRole('heading', { level: 1, name: '새 비밀번호 정하기' }),
    ).toBeInTheDocument()
    expect(screen.getByText('비밀번호 재설정은 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.queryByLabelText('새 비밀번호')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인으로' })).toHaveAttribute('href', '/login')
  })
})
