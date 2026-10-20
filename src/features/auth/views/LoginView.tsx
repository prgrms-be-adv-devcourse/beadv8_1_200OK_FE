import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Anchor, Button, PasswordInput, Stack, TextInput } from '@mantine/core'
import { CircleX } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Logo, PageHeader } from '@/shared/ui'
import { type LoginFormValues, loginSchema } from '../schemas'
import classes from './AuthView.module.css'

// A-01 로그인. 시안: b2c/Auth, AuthMobile (login 뷰)
// 실패는 어느 칸이 틀렸는지 알려 주지 않고 한 문구로(서버 detail 우선).

export type LoginViewProps = {
  onSubmit: (values: LoginFormValues) => void
  submitting?: boolean
  /** 로그인 실패 문구 (서버 detail) */
  errorMessage?: string | null
  /** 로그인 뒤 돌아갈 경로 (가입 링크에도 이어 붙인다) */
  returnTo?: string | null
  defaultValues?: Partial<LoginFormValues>
}

export function LoginView({
  onSubmit,
  submitting = false,
  errorMessage,
  returnTo,
  defaultValues,
}: LoginViewProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { loginId: '', password: '', ...defaultValues },
  })
  const signupPath = returnTo ? `/signup?returnTo=${encodeURIComponent(returnTo)}` : '/signup'

  return (
    <>
      <PageHeader title="로그인" backTo="/" />
      {/* 모바일 로그인만 본문 위에 로고(시안 AuthMobile). 데스크톱은 AuthLayout이 카드 위에 그린다 */}
      <div className={classes.mobileLogo}>
        <Logo preset="auth" />
      </div>

      <form className={classes.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="md">
          {errorMessage && (
            <Alert color="error" icon={<CircleX />} role="alert">
              {errorMessage}
            </Alert>
          )}
          <TextInput
            label="아이디"
            autoComplete="username"
            error={errors.loginId?.message}
            {...register('loginId')}
          />
          <PasswordInput
            label="비밀번호"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            로그인
          </Button>
        </Stack>
      </form>

      <nav aria-label="계정 메뉴" className={classes.links}>
        <Anchor component={Link} to="/find-account">
          아이디·비밀번호 찾기
        </Anchor>
        <span aria-hidden="true">|</span>
        <Anchor component={Link} to={signupPath}>
          회원가입
        </Anchor>
      </nav>
    </>
  )
}
