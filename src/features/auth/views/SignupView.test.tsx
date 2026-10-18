import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { SignupView, type SignupViewProps } from './SignupView'

function renderSignup(props: Partial<SignupViewProps> = {}) {
  const onSubmit = vi.fn()
  render(
    <MemoryRouter>
      <SignupView onSubmit={onSubmit} {...props} />
    </MemoryRouter>,
  )
  return { onSubmit, user: userEvent.setup() }
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, password = 'apple2026!') {
  await user.type(screen.getByLabelText('아이디'), 'seoyeon88')
  await user.type(screen.getByLabelText('이메일'), 'seoyeon88@example.com')
  await user.type(screen.getByLabelText('이름'), '이서연')
  await user.type(screen.getByLabelText('닉네임'), '주말장보기')
  await user.type(screen.getByLabelText('비밀번호'), password)
  await user.type(screen.getByLabelText('비밀번호 확인'), 'apple2026!')
}

describe('SignupView', () => {
  it('필수 약관에 모두 동의해야 가입 버튼이 켜진다', async () => {
    const { user } = renderSignup()
    const submit = screen.getByRole('button', { name: '가입하기' })

    expect(submit).toBeDisabled()
    expect(screen.getByText('필수 약관에 동의해 주세요')).toBeVisible()
    await user.click(screen.getByLabelText('약관 전체 동의'))
    expect(submit).toBeEnabled()
  })

  it('API 요청 모양으로 넘긴다 (비밀번호 확인은 빼고)', async () => {
    const { user, onSubmit } = renderSignup()
    await fillForm(user)
    await user.click(screen.getByLabelText('약관 전체 동의'))
    await user.click(screen.getByRole('button', { name: '가입하기' }))

    expect(onSubmit).toHaveBeenCalledWith({
      loginId: 'seoyeon88',
      email: 'seoyeon88@example.com',
      name: '이서연',
      nickname: '주말장보기',
      password: 'apple2026!',
      termsAgreed: true,
      privacyAgreed: true,
    })
  })

  it('규칙이 틀리면 막고 첫 오류 칸으로 focus한다', async () => {
    const { user, onSubmit } = renderSignup()
    await fillForm(user, 'apple')
    await user.click(screen.getByLabelText('약관 전체 동의'))
    await user.click(screen.getByRole('button', { name: '가입하기' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      await screen.findByText('영문, 숫자, 특수문자를 모두 포함해 8~20자로 입력해 주세요'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toHaveFocus()
  })

  it('서버 중복 오류를 그 칸에 붙인다', async () => {
    renderSignup({ serverErrors: { loginId: '이미 사용 중인 아이디예요' } })

    expect(await screen.findByText('이미 사용 중인 아이디예요')).toBeInTheDocument()
    expect(screen.getByLabelText('아이디')).toHaveAttribute('aria-invalid', 'true')
  })
})
