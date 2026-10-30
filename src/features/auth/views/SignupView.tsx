import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  VisuallyHidden,
} from '@mantine/core'
import { CircleX } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { type SignupRequest, TermsType } from '@/shared/api/types'
import { useServerFieldErrors } from '@/shared/lib/useServerFieldErrors'
import { DisabledReason, PageHeader, PasswordRules } from '@/shared/ui'
import { type SignupFormValues, signupSchema } from '../schemas'
import classes from './AuthView.module.css'

// A-02 회원가입. 시안: b2c/Auth, AuthMobile (signup 뷰)
// 아이디·이메일 중복 확인 API가 없어 버튼을 두지 않고, 제출 후 409/422를 그 칸의 오류로 보여 준다(A-10).
// API는 이용약관·개인정보 동의를 따로 받는다(termsAgreed · privacyAgreed). 둘 다 체크해야 가입 버튼이 켜진다.

export type SignupFieldErrors = Partial<Record<keyof SignupFormValues, string>>

export type SignupViewProps = {
  onSubmit: (values: SignupRequest) => void
  submitting?: boolean
  /** 필드에 붙일 서버 오류 (409 중복, 422 errors[].path) */
  serverErrors?: SignupFieldErrors
  /** 필드에 붙일 수 없는 서버 오류 */
  errorMessage?: string | null
  returnTo?: string | null
  defaultValues?: Partial<SignupFormValues>
}

const emptyValues: SignupFormValues = {
  loginId: '',
  email: '',
  name: '',
  nickname: '',
  password: '',
  passwordConfirm: '',
  termsAgreed: false,
  privacyAgreed: false,
}

export function SignupView({
  onSubmit,
  submitting = false,
  serverErrors,
  errorMessage,
  returnTo,
  defaultValues,
}: SignupViewProps) {
  const rulesId = useId()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { ...emptyValues, ...defaultValues },
  })
  useServerFieldErrors(setError, serverErrors)

  const [password, termsAgreed, privacyAgreed] = watch(['password', 'termsAgreed', 'privacyAgreed'])
  const allAgreed = termsAgreed && privacyAgreed
  const loginPath = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'

  const agreeAll = (checked: boolean) => {
    setValue('termsAgreed', checked, { shouldValidate: true })
    setValue('privacyAgreed', checked, { shouldValidate: true })
  }

  const submit = handleSubmit(({ passwordConfirm: _, ...values }) =>
    onSubmit({ ...values, termsAgreed: true, privacyAgreed: true }),
  )

  return (
    <>
      <PageHeader title="회원가입" backTo="/login" />
      <Text className={classes.lead}>
        가입하면 구매자로 시작해요. 판매자 신청은 가입 후에 할 수 있어요.
      </Text>

      <form className={classes.form} onSubmit={submit} noValidate>
        <Stack gap="md">
          {errorMessage && (
            <Alert color="error" icon={<CircleX />} role="alert">
              {errorMessage}
            </Alert>
          )}
          <TextInput
            label="아이디"
            description="영문 소문자·숫자 4~20자"
            autoComplete="username"
            error={errors.loginId?.message}
            {...register('loginId')}
          />
          <TextInput
            label="이메일"
            type="email"
            description="아이디와 이메일은 가입 후 바꿀 수 없어요"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <TextInput
              label="이름"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />
            <TextInput
              label="닉네임"
              description="2~30자"
              error={errors.nickname?.message}
              {...register('nickname')}
            />
          </SimpleGrid>
          <div>
            <PasswordInput
              label="비밀번호"
              autoComplete="new-password"
              aria-describedby={rulesId}
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordRules id={rulesId} value={password} />
          </div>
          <PasswordInput
            label="비밀번호 확인"
            autoComplete="new-password"
            error={errors.passwordConfirm?.message}
            {...register('passwordConfirm')}
          />

          <fieldset className={classes.agreements}>
            <VisuallyHidden component="legend">약관 동의</VisuallyHidden>
            <Checkbox
              className={classes.agreeAll}
              label="약관 전체 동의"
              checked={allAgreed}
              indeterminate={termsAgreed !== privacyAgreed}
              onChange={(event) => agreeAll(event.currentTarget.checked)}
            />
            <div className={classes.agreeRow}>
              {/* TODO(api): 서비스 이용약관 본문을 줄 API가 없어 ‘보기’ 링크를 두지 않는다 */}
              <Checkbox
                label="[필수] 이용약관 동의"
                checked={termsAgreed}
                onChange={(event) =>
                  setValue('termsAgreed', event.currentTarget.checked, { shouldValidate: true })
                }
              />
            </div>
            <div className={classes.agreeRow}>
              <Checkbox
                label="[필수] 개인정보 수집 및 이용 동의"
                checked={privacyAgreed}
                onChange={(event) =>
                  setValue('privacyAgreed', event.currentTarget.checked, { shouldValidate: true })
                }
              />
              <Anchor
                component={Link}
                to={`/terms/${TermsType.PERSONAL_INFORMATION_COLLECTION}`}
                size="sm"
                aria-label="개인정보 수집 및 이용 동의 보기"
              >
                보기
              </Anchor>
            </div>
          </fieldset>

          <DisabledReason reason={allAgreed ? null : '필수 약관에 동의해 주세요'} fullWidth>
            <Button type="submit" size="lg" fullWidth disabled={!allAgreed} loading={submitting}>
              가입하기
            </Button>
          </DisabledReason>
        </Stack>
      </form>

      <p className={classes.links}>
        이미 계정이 있나요?
        <Anchor component={Link} to={loginPath}>
          로그인
        </Anchor>
      </p>
    </>
  )
}
