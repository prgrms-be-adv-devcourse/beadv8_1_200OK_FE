import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { server } from '@/mocks/server'
import { render } from '@/test/render'
import { SignupPage } from './SignupPage'

function renderSignup() {
  render(
    <MemoryRouter initialEntries={['/signup']}>
      <SignupPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('아이디'), 'seoyeon88')
  await user.type(screen.getByLabelText('이메일'), 'seoyeon88@example.com')
  await user.type(screen.getByLabelText('이름'), '이서연')
  await user.type(screen.getByLabelText('닉네임'), '주말장보기')
  await user.type(screen.getByLabelText('비밀번호'), 'apple2026!')
  await user.type(screen.getByLabelText('비밀번호 확인'), 'apple2026!')
  await user.click(screen.getByLabelText('약관 전체 동의'))
  await user.click(screen.getByRole('button', { name: '가입하기' }))
}

const problem = (status: number, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

describe('SignupPage', () => {
  it('가입하면 완료 화면을 보여 준다', async () => {
    let body: unknown
    server.use(
      http.post('*/api/v1/members/signup', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ memberId: 9 }, { status: 201 })
      }),
    )
    const user = renderSignup()
    await submit(user)
    expect(
      await screen.findByRole('heading', { name: '주말장보기님, 가입을 환영해요' }),
    ).toBeInTheDocument()
    expect(body).toMatchObject({ loginId: 'seoyeon88', termsAgreed: true, privacyAgreed: true })
  })

  it('아이디 중복(409)은 아이디 칸 오류로 보여 주고 그 칸으로 focus한다', async () => {
    server.use(
      http.post('*/api/v1/members/signup', () => problem(409, '이미 사용 중인 아이디입니다.')),
    )
    const user = renderSignup()
    await submit(user)
    expect(await screen.findByText('이미 사용 중인 아이디입니다.')).toBeInTheDocument()
    expect(screen.getByLabelText('아이디')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('아이디')).toHaveFocus()
  })

  it('검증 실패(422)는 errors[].path 칸에 서버 문구를 붙인다', async () => {
    server.use(
      http.post('*/api/v1/members/signup', () =>
        problem(422, '요청 값이 올바르지 않습니다.', {
          errors: [
            { detail: '이메일 형식이 올바르지 않습니다.', pointer: '/email', path: 'email' },
          ],
        }),
      ),
    )
    const user = renderSignup()
    await submit(user)
    expect(await screen.findByText('이메일 형식이 올바르지 않습니다.')).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toHaveFocus()
  })

  it('칸에 붙일 수 없는 오류는 폼 위에 서버 문구로 보여 준다', async () => {
    server.use(
      http.post('*/api/v1/members/signup', () =>
        problem(500, '서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요'),
      ),
    )
    const user = renderSignup()
    await submit(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('서버에 문제가 생겼어요')
  })
})
