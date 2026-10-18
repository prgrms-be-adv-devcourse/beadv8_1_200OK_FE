import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Group,
  NativeSelect,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core'
import { CircleCheck, CircleX, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { BANKS } from '@/shared/lib/constants'
import { useServerFieldErrors } from '@/shared/lib/useServerFieldErrors'
import { PageHeader, ProgressSteps } from '@/shared/ui'
import { ApplicationSummary } from '../components/ApplicationSummary'
import { type ApplyFormValues, applySchema, stepFields } from '../schemas'
import type { SellerApplication, SellerApplyRequest } from '../types'
import classes from './SellerApplyView.module.css'

// S-01 판매자 등록 신청 /seller/apply. 시안: b2c/SellerApplyMobile(3단계), b2c/SellerApply(데스크톱 한 페이지)
// 3단계: 상점 정보 → 정산 계좌 → 신청 내용 확인 (SCREENS.md). 승인은 관리자가 직접 한다(B-4).
// 사업자등록번호 중복은 제출 뒤 서버 오류(409)로 그 칸에 붙이고 1단계로 돌아간다.
// TODO(api): 📝 POST /sellers

const STEPS = ['상점 정보', '정산 계좌', '신청 내용 확인']

export type ApplyFieldErrors = Partial<Record<keyof ApplyFormValues, string>>

export type SellerApplyViewProps = {
  onSubmit: (request: SellerApplyRequest) => void
  submitting?: boolean
  defaultValues?: Partial<ApplyFormValues>
  serverErrors?: ApplyFieldErrors
  /** 칸에 붙일 수 없는 서버 오류 */
  errorMessage?: string | null
  /** 반려 뒤 다시 신청할 때 반려 사유 */
  rejectReason?: string | null
  /** 신청을 마쳤으면 완료 화면 */
  completed?: SellerApplication | null
  /** 처음 단계 (미리보기) */
  defaultStep?: number
}

export function SellerApplyView({
  onSubmit,
  submitting = false,
  defaultValues,
  serverErrors,
  errorMessage,
  rejectReason,
  completed,
  defaultStep = 0,
}: SellerApplyViewProps) {
  const [step, setStep] = useState(defaultStep)
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setError,
    formState: { errors },
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: { bankName: BANKS[0], ...defaultValues },
  })
  useServerFieldErrors(setError, serverErrors)

  // 서버 오류가 붙은 칸이 있는 단계로 돌아간다
  useEffect(() => {
    if (!serverErrors) return
    const target = stepFields.findIndex((fields) => fields.some((field) => serverErrors[field]))
    if (target >= 0) setStep(target)
  }, [serverErrors])

  const hasFieldErrors = Object.keys(errors).length > 0

  if (completed) {
    return (
      <div className={classes.root}>
        <PageHeader title="판매자 등록 신청" backTo="/me" />
        <section className={classes.done} aria-labelledby="apply-done">
          <ThemeIcon color="success" variant="light" size={56} radius="50%" aria-hidden="true">
            <CircleCheck size={28} />
          </ThemeIcon>
          <h2 id="apply-done" className={classes.doneTitle} role="status">
            판매자 등록을 신청했어요
          </h2>
          <Text c="var(--pd-color-text-secondary)">
            관리자가 확인을 시작하면 ‘심사 중’으로 바뀌어요. 결과는 신청 현황에서 바로 볼 수 있어요.
          </Text>
        </section>
        <ApplicationSummary values={completed} appliedAt={completed.appliedAt} />
        <Group justify="center" gap="xs">
          <Button component={Link} to="/me" variant="outline" size="lg">
            마이페이지로
          </Button>
          <Button component={Link} to="/seller/apply/status" size="lg">
            신청 현황 보기
          </Button>
        </Group>
      </div>
    )
  }

  const next = async () => {
    const fields = stepFields[step] ?? []
    if (await trigger(fields, { shouldFocus: true })) setStep(step + 1)
  }

  return (
    <div className={classes.root}>
      <PageHeader title="판매자 등록 신청" backTo="/me" />
      <Text c="var(--pd-color-text-secondary)">
        농가 정보를 보내 주시면 관리자가 직접 확인한 뒤 승인해요. 승인 전에도 구매는 그대로 할 수
        있어요.
      </Text>

      <ProgressSteps steps={STEPS} current={step} label="신청 단계" />

      {rejectReason && (
        <Alert color="error" icon={<CircleX />} title={`반려 사유: ${rejectReason}`}>
          정보를 고쳐서 다시 신청해 주세요.
        </Alert>
      )}
      {(hasFieldErrors || errorMessage) && (
        <Alert color="error" icon={<CircleX />} title="입력값을 확인해 주세요" role="alert">
          {errorMessage ?? '신청이 아직 접수되지 않았어요.'}
        </Alert>
      )}

      <form
        onSubmit={handleSubmit((values) => onSubmit(values))}
        noValidate
        className={classes.form}
      >
        {/* 단계를 넘겨도 입력값이 남도록 숨기기만 한다 */}
        <section className={classes.card} hidden={step !== 0} aria-labelledby="apply-shop">
          <h2 id="apply-shop" className={classes.cardTitle}>
            상점 정보
          </h2>
          <div className={classes.grid}>
            <TextInput
              label="상호명"
              error={errors.storeName?.message}
              {...register('storeName')}
            />
            <TextInput
              label="대표자명"
              autoComplete="name"
              error={errors.representativeName?.message}
              {...register('representativeName')}
            />
            <TextInput
              label="사업자등록번호"
              inputMode="numeric"
              placeholder="000-00-00000"
              description="한 사업자등록번호로 한 번만 신청할 수 있어요"
              classNames={{ input: 'pd-num' }}
              error={errors.businessNumber?.message}
              {...register('businessNumber')}
            />
            <TextInput
              label="통신판매업 신고번호"
              placeholder="제2026-경북청송-0031호"
              error={errors.mailOrderNumber?.message}
              {...register('mailOrderNumber')}
            />
          </div>
        </section>

        <section className={classes.card} hidden={step !== 1} aria-labelledby="apply-account">
          <div>
            <h2 id="apply-account" className={classes.cardTitle}>
              정산 계좌
            </h2>
            <Text className={classes.help}>
              구매확정된 판매 대금이 판매자 지갑을 거쳐 이 계좌로 정산돼요
            </Text>
          </div>
          <div className={classes.grid}>
            <NativeSelect
              label="은행"
              data={[...BANKS]}
              error={errors.bankName?.message}
              {...register('bankName')}
            />
            <TextInput
              label="계좌번호"
              inputMode="numeric"
              classNames={{ input: 'pd-num' }}
              error={errors.accountNumber?.message}
              {...register('accountNumber')}
            />
            <TextInput
              label="예금주"
              error={errors.accountHolder?.message}
              {...register('accountHolder')}
            />
          </div>
        </section>

        {step === 2 && (
          <Stack gap="sm">
            <div>
              <h2 className={classes.cardTitle}>신청 내용 확인</h2>
              <Text className={classes.help}>보내기 전에 한 번 더 확인해 주세요.</Text>
            </div>
            <ApplicationSummary
              values={getValues()}
              onEditShop={() => setStep(0)}
              onEditAccount={() => setStep(1)}
              headingLevel="h3"
            />
            <Alert color="info" icon={<Info />}>
              관리자가 직접 확인한 뒤 승인해요. 상점 소개와 프로필 사진은 승인 후에 입력해요.
            </Alert>
          </Stack>
        )}

        <div className={classes.actions}>
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>
              이전
            </Button>
          )}
          {step < 2 ? (
            <Button size="lg" className={classes.primary} onClick={next}>
              다음
            </Button>
          ) : (
            <Button type="submit" size="lg" className={classes.primary} loading={submitting}>
              판매자 등록 신청하기
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
