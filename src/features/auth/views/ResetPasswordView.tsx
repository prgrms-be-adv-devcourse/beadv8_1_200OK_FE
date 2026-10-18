import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, PasswordInput, Stack, Text, ThemeIcon } from '@mantine/core'
import { CircleCheck, CircleX, Clock } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { PASSWORD_RESET_LINK_MINUTES } from '@/shared/lib/constants'
import { PageHeader, PasswordRules } from '@/shared/ui'
import { type ResetPasswordFormValues, resetPasswordSchema } from '../schemas'
import classes from './AuthView.module.css'

// 새 비밀번호 정하기 (메일 링크로 연다). 시안: b2c/FindAccount (reset · done · expired)
// TODO(api): 비밀번호 재설정 API가 없다(C-5)

export type ResetPasswordStatus = 'form' | 'done' | 'expired'

export type ResetPasswordViewProps = {
  status: ResetPasswordStatus
  maskedLoginId?: string
  onSubmit: (values: { password: string }) => void
  submitting?: boolean
  errorMessage?: string | null
}

export function ResetPasswordView({
  status,
  maskedLoginId,
  onSubmit,
  submitting = false,
  errorMessage,
}: ResetPasswordViewProps) {
  const rulesId = useId()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  })

  if (status === 'done') {
    return (
      <section className={classes.result} aria-labelledby="reset-done">
        <ThemeIcon color="success" variant="light" size={56} radius="50%" aria-hidden="true">
          <CircleCheck size={28} />
        </ThemeIcon>
        <h1 id="reset-done" className={classes.resultTitle}>
          비밀번호를 바꿨어요
        </h1>
        <p className={classes.resultText}>새 비밀번호로 다시 로그인해 주세요.</p>
        <div className={classes.actions}>
          <Button component={Link} to="/login" size="lg">
            로그인하기
          </Button>
        </div>
      </section>
    )
  }

  if (status === 'expired') {
    return (
      <section className={classes.result} aria-labelledby="reset-expired">
        <ThemeIcon color="warning" variant="light" size={56} radius="50%" aria-hidden="true">
          <Clock size={28} />
        </ThemeIcon>
        <h1 id="reset-expired" className={classes.resultTitle}>
          링크가 만료됐어요
        </h1>
        <p className={classes.resultText}>
          재설정 링크는 보낸 뒤 {PASSWORD_RESET_LINK_MINUTES}분 동안만 쓸 수 있어요. 비밀번호
          찾기에서 링크를 다시 받아 주세요.
        </p>
        <div className={classes.actions}>
          <Button component={Link} to="/find-account?tab=password" size="lg">
            링크 다시 받기
          </Button>
        </div>
      </section>
    )
  }

  return (
    <>
      <PageHeader title="새 비밀번호 정하기" backTo="/login" />
      {maskedLoginId && (
        <Text className={`pd-num ${classes.lead}`}>{maskedLoginId} 계정의 비밀번호를 바꿔요</Text>
      )}
      <form
        className={classes.form}
        onSubmit={handleSubmit(({ password }) => onSubmit({ password }))}
        noValidate
      >
        <Stack gap="md">
          {errorMessage && (
            <Alert color="error" icon={<CircleX />} role="alert">
              {errorMessage}
            </Alert>
          )}
          <div>
            <PasswordInput
              label="새 비밀번호"
              autoComplete="new-password"
              aria-describedby={rulesId}
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordRules id={rulesId} value={watch('password')} />
          </div>
          <PasswordInput
            label="새 비밀번호 확인"
            autoComplete="new-password"
            error={errors.passwordConfirm?.message}
            {...register('passwordConfirm')}
          />
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            비밀번호 바꾸기
          </Button>
        </Stack>
      </form>
    </>
  )
}
