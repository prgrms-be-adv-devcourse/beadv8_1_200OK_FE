import { passwordMessage } from '@/shared/lib/password'
import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { foundId, loginFailedMessage, maskedEmail } from './fixtures'
import {
  FindAccountNotConnectedView,
  FindAccountView,
  type FindAccountViewProps,
} from './views/FindAccountView'
import { LoginView } from './views/LoginView'
import { ResetPasswordNotConnectedView, ResetPasswordView } from './views/ResetPasswordView'
import { SignupCompleteView } from './views/SignupCompleteView'
import { SignupView, type SignupViewProps } from './views/SignupView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다)

const noop = () => {}

const filled = {
  loginId: 'seoyeon88',
  email: 'seoyeon88@example.com',
  name: '이서연',
  nickname: '주말장보기',
  password: 'apple2026!',
  passwordConfirm: 'apple2026!',
  termsAgreed: true,
  privacyAgreed: true,
}

const signup = (props: Partial<SignupViewProps> = {}) => <SignupView onSubmit={noop} {...props} />

const find = (props: Partial<FindAccountViewProps> = {}) => (
  <FindAccountView
    tab="id"
    onTabChange={noop}
    onFindId={noop}
    onRequestReset={noop}
    onResend={noop}
    {...props}
  />
)

export const authPreviews: ScreenPreview[] = [
  {
    id: 'login',
    title: 'A-01 로그인',
    layout: 'auth',
    path: '/login',
    states: [
      {
        id: 'default',
        label: '기본',
        session: 'guest',
        render: () => <LoginView onSubmit={noop} />,
      },
      {
        id: 'failed',
        label: '로그인 실패',
        session: 'guest',
        render: () => (
          <LoginView
            onSubmit={noop}
            errorMessage={loginFailedMessage}
            defaultValues={{ loginId: 'seoyeon88' }}
          />
        ),
      },
      {
        id: 'submitting',
        label: '처리 중',
        session: 'guest',
        render: () => (
          <LoginView
            onSubmit={noop}
            submitting
            defaultValues={{ loginId: 'seoyeon88', password: 'apple2026!' }}
          />
        ),
      },
    ],
  },
  {
    id: 'signup',
    title: 'A-02 회원가입 · 가입 완료',
    layout: 'auth',
    path: '/signup',
    states: [
      {
        id: 'empty',
        label: '처음 (동의 미체크 → 비활성)',
        session: 'guest',
        render: () => signup(),
      },
      {
        id: 'filled',
        label: '입력 완료',
        session: 'guest',
        render: () => signup({ defaultValues: filled }),
      },
      {
        id: 'duplicate',
        label: '아이디·이메일 중복',
        session: 'guest',
        render: () =>
          signup({
            defaultValues: filled,
            serverErrors: {
              loginId: '이미 사용 중인 아이디예요',
              email: '이미 가입한 이메일이에요. 로그인하거나 아이디 찾기를 해 주세요.',
            },
          }),
      },
      {
        id: 'invalid',
        label: '규칙 오류',
        session: 'guest',
        render: () =>
          signup({
            defaultValues: {
              ...filled,
              loginId: 'Seo',
              password: 'apple',
              passwordConfirm: 'apples',
            },
            serverErrors: {
              loginId: '영문 소문자·숫자 4~20자로 입력해 주세요',
              password: passwordMessage,
              passwordConfirm: '비밀번호가 서로 달라요',
            },
          }),
      },
      {
        id: 'no-agree',
        label: '동의 미체크',
        session: 'guest',
        render: () =>
          signup({ defaultValues: { ...filled, termsAgreed: false, privacyAgreed: true } }),
      },
      {
        id: 'done',
        label: '가입 완료',
        session: 'guest',
        render: () => <SignupCompleteView nickname="주말장보기" />,
      },
    ],
  },
  {
    id: 'find-account',
    title: '아이디·비밀번호 찾기',
    layout: 'auth',
    path: '/find-account',
    states: [
      {
        id: 'not-connected',
        label: '연결 전 (지금 화면)',
        session: 'guest',
        render: () => <FindAccountNotConnectedView />,
      },
      { id: 'id', label: '아이디 찾기', session: 'guest', render: () => find() },
      {
        id: 'id-found',
        label: '아이디 결과',
        session: 'guest',
        render: () => find({ foundId }),
      },
      {
        id: 'id-mismatch',
        label: '아이디 불일치',
        session: 'guest',
        render: () => find({ idError: '이름과 가입할 때 쓴 이메일을 다시 확인해 주세요.' }),
      },
      {
        id: 'password',
        label: '비밀번호 찾기',
        session: 'guest',
        render: () => find({ tab: 'password' }),
      },
      {
        id: 'password-mismatch',
        label: '비밀번호 불일치',
        session: 'guest',
        render: () =>
          find({
            tab: 'password',
            passwordError: '아이디가 기억나지 않으면 아이디 찾기를 먼저 해 주세요.',
          }),
      },
      {
        id: 'sent',
        label: '링크 보냄 (60초 대기)',
        session: 'guest',
        render: () => find({ tab: 'password', sentTo: maskedEmail, resendIn: 42 }),
      },
      {
        id: 'resend',
        label: '다시 보내기 가능',
        session: 'guest',
        render: () => find({ tab: 'password', sentTo: maskedEmail, resendIn: 0 }),
      },
    ],
  },
  {
    id: 'reset-password',
    title: '새 비밀번호 정하기',
    layout: 'auth',
    path: '/find-account/reset',
    states: [
      {
        id: 'not-connected',
        label: '연결 전 (지금 화면)',
        session: 'guest',
        render: () => <ResetPasswordNotConnectedView />,
      },
      {
        id: 'form',
        label: '재설정',
        session: 'guest',
        render: () => (
          <ResetPasswordView status="form" maskedLoginId={foundId.maskedLoginId} onSubmit={noop} />
        ),
      },
      {
        id: 'done',
        label: '완료',
        session: 'guest',
        render: () => <ResetPasswordView status="done" onSubmit={noop} />,
      },
      {
        id: 'expired',
        label: '링크 만료',
        session: 'guest',
        render: () => <ResetPasswordView status="expired" onSubmit={noop} />,
      },
    ],
  },
]
