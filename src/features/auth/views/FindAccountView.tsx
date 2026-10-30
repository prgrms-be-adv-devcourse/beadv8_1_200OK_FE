import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Anchor, Button, Stack, Tabs, Text, TextInput, ThemeIcon } from '@mantine/core'
import { CircleCheck, CircleX, MailCheck } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { PASSWORD_RESET_LINK_MINUTES } from '@/shared/lib/constants'
import { formatDate } from '@/shared/lib/format'
import { NotConnected, PageHeader } from '@/shared/ui'
import {
  type FindIdFormValues,
  type FindPasswordFormValues,
  findIdSchema,
  findPasswordSchema,
} from '../schemas'
import classes from './AuthView.module.css'

// 아이디·비밀번호 찾기. 시안: b2c/FindAccount, FindAccountMobile
// TODO(api): ❌ API가 없다(C-5). 아이디는 일부를 가려(a**bc**) 보여 주고, 비밀번호는 재설정 링크(30분)를 메일로 보낸다.
// 지금 라우트는 FindAccountNotConnectedView만 그린다. 폼·결과는 /__design 시안용으로 남겨 둔다.

export type FindAccountTab = 'id' | 'password'

export type FoundId = { maskedLoginId: string; joinedAt: string }

export type FindAccountViewProps = {
  tab: FindAccountTab
  onTabChange: (tab: FindAccountTab) => void
  onFindId: (values: FindIdFormValues) => void
  onRequestReset: (values: FindPasswordFormValues) => void
  submitting?: boolean
  /** 아이디 찾기 결과. 있으면 폼 대신 결과 */
  foundId?: FoundId | null
  idError?: string | null
  /** 재설정 링크를 보낸 이메일(가린 값). 있으면 폼 대신 안내 */
  sentTo?: string | null
  passwordError?: string | null
  /** 다시 보낼 수 있을 때까지 남은 초 */
  resendIn?: number
  onResend?: () => void
}

function FindIdPanel({
  onSubmit,
  submitting,
  error,
  found,
  onGoPassword,
}: {
  onSubmit: (values: FindIdFormValues) => void
  submitting: boolean
  error?: string | null
  found?: FoundId | null
  onGoPassword: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FindIdFormValues>({
    resolver: zodResolver(findIdSchema),
    defaultValues: { name: '', email: '' },
  })

  if (found) {
    return (
      <div className={classes.result} role="status">
        <ThemeIcon color="success" variant="light" size={56} radius="50%" aria-hidden="true">
          <CircleCheck size={28} />
        </ThemeIcon>
        <h2 className={classes.resultTitle}>가입한 아이디를 찾았어요</h2>
        <dl className={classes.facts}>
          <div>
            <dt>아이디</dt>
            <dd className="pd-num">{found.maskedLoginId}</dd>
          </div>
          <div>
            <dt>가입일</dt>
            <dd className="pd-num">{formatDate(found.joinedAt)}</dd>
          </div>
        </dl>
        <Text className={classes.help}>개인정보를 지키려고 아이디 일부를 가려서 보여 드려요</Text>
        <div className={classes.actions}>
          <Button variant="outline" size="lg" onClick={onGoPassword}>
            비밀번호 찾기
          </Button>
          <Button component={Link} to="/login" size="lg">
            로그인하기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack gap="md">
        <Text>가입할 때 입력한 이름과 이메일을 알려 주세요.</Text>
        {error && (
          <Alert
            color="error"
            icon={<CircleX />}
            title="입력한 정보와 일치하는 회원이 없어요"
            role="alert"
          >
            {error}
          </Alert>
        )}
        <TextInput
          label="이름"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextInput
          label="이메일"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          아이디 찾기
        </Button>
      </Stack>
    </form>
  )
}

function FindPasswordPanel({
  onSubmit,
  submitting,
  error,
  sentTo,
  resendIn = 0,
  onResend,
}: {
  onSubmit: (values: FindPasswordFormValues) => void
  submitting: boolean
  error?: string | null
  sentTo?: string | null
  resendIn?: number
  onResend?: () => void
}) {
  const waitId = useId()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FindPasswordFormValues>({
    resolver: zodResolver(findPasswordSchema),
    defaultValues: { loginId: '', email: '' },
  })

  if (sentTo) {
    const waiting = resendIn > 0
    return (
      <div className={classes.result} role="status">
        <ThemeIcon color="info" variant="light" size={56} radius="50%" aria-hidden="true">
          <MailCheck size={28} />
        </ThemeIcon>
        <h2 className={classes.resultTitle}>재설정 링크를 보냈어요</h2>
        <p className={classes.resultText}>메일의 링크를 눌러 새 비밀번호를 정해 주세요.</p>
        <dl className={classes.facts}>
          <div>
            <dt>받는 이메일</dt>
            <dd className="pd-num">{sentTo}</dd>
          </div>
          <div>
            <dt>링크 유효 시간</dt>
            <dd>보낸 뒤 {PASSWORD_RESET_LINK_MINUTES}분</dd>
          </div>
        </dl>
        <Text className={classes.help}>
          메일이 보이지 않으면 스팸함을 확인해 주세요. {PASSWORD_RESET_LINK_MINUTES}분이 지나면
          링크를 다시 받아야 해요.
        </Text>
        <div className={classes.actions}>
          <Button
            variant="outline"
            size="lg"
            className="pd-num"
            disabled={waiting}
            onClick={onResend}
            aria-describedby={waiting ? waitId : undefined}
          >
            {waiting ? `다시 보내기 · ${resendIn}초` : '다시 보내기'}
          </Button>
        </div>
        {waiting && (
          <Text id={waitId} className={`pd-num ${classes.help}`}>
            {resendIn}초 뒤에 다시 보낼 수 있어요
          </Text>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack gap="md">
        <Text>
          아이디와 가입할 때 쓴 이메일을 입력하면 비밀번호를 다시 정하는 링크를 메일로 보내 드려요.
        </Text>
        {error && (
          <Alert
            color="error"
            icon={<CircleX />}
            title="아이디와 이메일이 일치하는 회원이 없어요"
            role="alert"
          >
            {error}
          </Alert>
        )}
        <TextInput
          label="아이디"
          autoComplete="username"
          error={errors.loginId?.message}
          {...register('loginId')}
        />
        <TextInput
          label="이메일"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          재설정 링크 받기
        </Button>
      </Stack>
    </form>
  )
}

export function FindAccountView({
  tab,
  onTabChange,
  onFindId,
  onRequestReset,
  submitting = false,
  foundId,
  idError,
  sentTo,
  passwordError,
  resendIn,
  onResend,
}: FindAccountViewProps) {
  return (
    <>
      <PageHeader title="아이디·비밀번호 찾기" backTo="/login" />
      <Tabs
        value={tab}
        onChange={(value) => onTabChange(value === 'password' ? 'password' : 'id')}
        mt="md"
      >
        <Tabs.List grow aria-label="찾을 항목">
          <Tabs.Tab value="id">아이디 찾기</Tabs.Tab>
          <Tabs.Tab value="password">비밀번호 찾기</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="id" pt="lg">
          <FindIdPanel
            onSubmit={onFindId}
            submitting={submitting}
            error={idError}
            found={foundId}
            onGoPassword={() => onTabChange('password')}
          />
        </Tabs.Panel>
        <Tabs.Panel value="password" pt="lg">
          <FindPasswordPanel
            onSubmit={onRequestReset}
            submitting={submitting}
            error={passwordError}
            sentTo={sentTo}
            resendIn={resendIn}
            onResend={onResend}
          />
        </Tabs.Panel>
      </Tabs>
      <nav aria-label="계정 메뉴" className={classes.links}>
        <Anchor component={Link} to="/login">
          로그인으로
        </Anchor>
      </nav>
    </>
  )
}

/** API가 없어 지금 라우트가 그리는 ‘연결 전’ 화면 */
export function FindAccountNotConnectedView() {
  return (
    <>
      <PageHeader title="아이디·비밀번호 찾기" backTo="/login" />
      <NotConnected
        title="아이디·비밀번호 찾기는 아직 연결되지 않았어요"
        description="서버 기능이 준비되면 여기서 찾을 수 있어요."
        api="❌ 아이디 찾기·비밀번호 재설정 링크 (C-5)"
        action={{ label: '로그인으로', to: '/login' }}
      />
    </>
  )
}
