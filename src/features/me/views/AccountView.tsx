import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  NativeSelect,
  PasswordInput,
  Skeleton,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core'
import { CircleAlert, CircleCheck, MapPin } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ShippingAddress } from '@/shared/api/types'
import { WITHDRAWAL_GRACE_DAYS } from '@/shared/lib/constants'
import { formatDate, formatPrice } from '@/shared/lib/format'
import { useServerFieldErrors } from '@/shared/lib/useServerFieldErrors'
import {
  AddressModal,
  DisabledReason,
  EmptyView,
  NotConnected,
  PageHeader,
  PasswordRules,
  QueryState,
} from '@/shared/ui'
import { withdrawReasonLabels } from '../labels'
import {
  type InfoFormValues,
  infoSchema,
  type PasswordChangeFormValues,
  passwordChangeSchema,
} from '../schemas'
import { type MyProfile, type WithdrawBlock, WithdrawReason } from '../types'
import classes from './AccountView.module.css'

// B-15 계정 관리 /me/account?tab=info|password|address|withdraw. 시안: b2c/Account, AccountMobile
// 탈퇴 차단: 예치금 잔액 · 진행 중 요청 · 판매자 (C-13), 신청 뒤 7일 유예.
// ✅ 내 정보 탭: GET·PUT /members/me (AccountInfoPanel).
// TODO(api): ❌ POST /members/me/password, 배송지 GET/PUT/DELETE, POST /members/me/withdrawal 없음
//   지금 라우트는 AccountNotConnectedView(내 정보 탭만 실제, 나머지 탭은 ‘연결 전’)를 그린다. AccountView는 /__design 시안용으로 남겨 둔다.

export type AccountTab = 'info' | 'password' | 'address' | 'withdraw'

type MaybeAsync = unknown

/** 핸들러가 끝나면 after를 부른다. 실패(reject)하면 모달을 열어 둔다(오류 문구는 밖에서) */
async function run(task: () => MaybeAsync, after: () => void) {
  try {
    await task()
    after()
  } catch {
    // 열어 둔다
  }
}

export type AccountViewProps = {
  tab: AccountTab
  onTabChange: (tab: AccountTab) => void
  profile: MyProfile
  onSaveInfo: (values: InfoFormValues) => MaybeAsync
  onChangePassword: (values: { currentPassword: string; newPassword: string }) => MaybeAsync
  /** 서버가 돌려준 비밀번호 칸 오류 (예: 현재 비밀번호가 맞지 않아요) */
  passwordErrors?: Partial<Record<keyof PasswordChangeFormValues, string>>
  address: ShippingAddress | null
  onSaveAddress: (address: ShippingAddress) => MaybeAsync
  onDeleteAddress: () => MaybeAsync
  withdrawBlock?: WithdrawBlock | null
  /** 탈퇴 차단 문구에 쓰는 잔액 */
  balance?: number
  onWithdraw: (reason: WithdrawReason) => MaybeAsync
  /** 탈퇴 신청을 마쳤으면 탈퇴 완료 예정일 */
  withdrawCompletesAt?: string | null
  submitting?: boolean
  /** 처음부터 열어 둘 모달 (미리보기) */
  defaultModal?: 'address' | 'deleteAddress' | 'withdraw' | null
}

const tabs: { value: AccountTab; label: string }[] = [
  { value: 'info', label: '내 정보' },
  { value: 'password', label: '비밀번호' },
  { value: 'address', label: '배송지' },
  { value: 'withdraw', label: '회원 탈퇴' },
]

function blockText(block: WithdrawBlock, balance: number): [string, string] {
  switch (block) {
    case 'balance':
      return [
        `예치금 ${formatPrice(balance)}이 남아 있어요`,
        '고객센터에 문의해 환불받은 뒤 탈퇴할 수 있어요.',
      ]
    case 'pending':
      return ['진행 중인 주문·충전·취소 요청이 있어요', '처리가 끝난 뒤에 탈퇴할 수 있어요.']
    case 'seller':
      return [
        '판매자는 고객센터를 통해 탈퇴할 수 있어요',
        '이 화면에서는 탈퇴를 신청할 수 없어요. 고객센터에 문의해 주세요.',
      ]
  }
}

type InfoFormProps = {
  profile: MyProfile
  onSave: AccountViewProps['onSaveInfo']
  submitting: boolean
  /** 서버가 돌려준 칸 오류 (422 errors[].path) */
  serverErrors?: Partial<Record<keyof InfoFormValues, string>>
  /** 칸에 붙일 수 없는 저장 실패 문구 */
  errorMessage?: string
  /** 저장을 마쳤으면 안내를 보인다 */
  saved?: boolean
}

function InfoForm({
  profile,
  onSave,
  submitting,
  serverErrors,
  errorMessage,
  saved,
}: InfoFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<InfoFormValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: { name: profile.name, nickname: profile.nickname },
  })
  useServerFieldErrors(setError, serverErrors)

  return (
    <form className={classes.card} onSubmit={handleSubmit((values) => onSave(values))} noValidate>
      {errorMessage && (
        <Alert color="error" icon={<CircleAlert />} role="alert">
          {errorMessage}
        </Alert>
      )}
      {saved && !errorMessage && (
        <Alert color="success" icon={<CircleCheck />} role="status">
          내 정보를 저장했어요
        </Alert>
      )}
      <div className={classes.grid}>
        <TextInput label="아이디" value={profile.loginId} readOnly description="변경할 수 없어요" />
        <TextInput label="이메일" value={profile.email} readOnly description="변경할 수 없어요" />
        <TextInput
          label="이름"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextInput
          label="닉네임"
          description="리뷰와 판매자 화면에 보이는 이름이에요 · 2~30자"
          error={errors.nickname?.message}
          {...register('nickname')}
        />
      </div>
      <Group justify="flex-end">
        <Button type="submit" loading={submitting}>
          저장
        </Button>
      </Group>
    </form>
  )
}

function PasswordForm({
  onSave,
  serverErrors,
  submitting,
}: {
  onSave: AccountViewProps['onChangePassword']
  serverErrors?: AccountViewProps['passwordErrors']
  submitting: boolean
}) {
  const rulesId = useId()
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' },
  })
  useServerFieldErrors(setError, serverErrors)

  return (
    <form
      className={classes.card}
      onSubmit={handleSubmit(({ currentPassword, newPassword }) =>
        onSave({ currentPassword, newPassword }),
      )}
      noValidate
    >
      <Stack gap="md" className={classes.narrow}>
        <PasswordInput
          label="현재 비밀번호"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <div>
          <PasswordInput
            label="새 비밀번호"
            autoComplete="new-password"
            aria-describedby={rulesId}
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordRules id={rulesId} value={watch('newPassword')} />
        </div>
        <PasswordInput
          label="새 비밀번호 확인"
          autoComplete="new-password"
          error={errors.newPasswordConfirm?.message}
          {...register('newPasswordConfirm')}
        />
      </Stack>
      <Group justify="flex-end">
        <Button type="submit" loading={submitting}>
          비밀번호 변경
        </Button>
      </Group>
    </form>
  )
}

function WithdrawForm({
  block,
  balance,
  onWithdraw,
  completesAt,
  submitting,
  defaultOpen,
}: {
  block: WithdrawBlock | null
  balance: number
  onWithdraw: AccountViewProps['onWithdraw']
  completesAt?: string | null
  submitting: boolean
  defaultOpen: boolean
}) {
  const [reason, setReason] = useState<WithdrawReason | null>(
    defaultOpen ? WithdrawReason.RARELY_USED : null,
  )
  const [agreed, setAgreed] = useState(defaultOpen)
  const [confirmOpen, setConfirmOpen] = useState(defaultOpen)

  if (completesAt) {
    return (
      <Alert color="success" icon={<CircleCheck />} title="탈퇴를 신청했어요" role="status">
        <span className="pd-num">{formatDate(completesAt, 'monthDayWeek')}에 탈퇴가 완료돼요.</span>
      </Alert>
    )
  }

  const blocked = block ? blockText(block, balance) : null
  const disabledReason = blocked
    ? '위 안내를 먼저 처리해 주세요'
    : !reason
      ? '탈퇴 사유를 골라 주세요'
      : !agreed
        ? '유의사항을 확인해 주세요'
        : null

  return (
    <Stack gap="md">
      {blocked && (
        <Alert color="warning" icon={<CircleAlert />} title={blocked[0]} role="alert">
          {blocked[1]}
        </Alert>
      )}
      <section className={classes.card} aria-label="회원 탈퇴">
        <NativeSelect
          label="탈퇴 사유"
          className={classes.narrow}
          data={[
            { value: '', label: '사유를 골라 주세요' },
            ...Object.values(WithdrawReason).map((value) => ({
              value,
              label: withdrawReasonLabels[value],
            })),
          ]}
          value={reason ?? ''}
          onChange={(event) =>
            setReason((event.currentTarget.value || null) as WithdrawReason | null)
          }
          disabled={blocked !== null}
        />
        <div className={classes.notice}>
          <strong>탈퇴 전에 확인해 주세요</strong>
          <ul>
            <li>탈퇴를 신청하면 {WITHDRAWAL_GRACE_DAYS}일 뒤 탈퇴돼요.</li>
            <li>주문·결제 기록은 법에 따라 5년간 보관돼요.</li>
            <li>예치금이 남아 있으면 고객센터에서 환불받은 뒤 탈퇴할 수 있어요.</li>
          </ul>
        </div>
        <Checkbox
          label="유의사항을 모두 확인했어요"
          checked={agreed}
          onChange={(event) => setAgreed(event.currentTarget.checked)}
          disabled={blocked !== null}
        />
        <Group justify="flex-end">
          <DisabledReason reason={disabledReason}>
            <Button
              color="red"
              disabled={disabledReason !== null}
              onClick={() => setConfirmOpen(true)}
            >
              탈퇴 신청
            </Button>
          </DisabledReason>
        </Group>
      </section>

      <Modal opened={confirmOpen} onClose={() => setConfirmOpen(false)} title="정말 탈퇴할까요?">
        <Text>
          {WITHDRAWAL_GRACE_DAYS}일 뒤 탈퇴가 완료되고, 그 뒤에는 이 아이디로 로그인할 수 없어요.
        </Text>
        <Group justify="flex-end" gap="xs" mt="lg">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            닫기
          </Button>
          <Button
            color="red"
            loading={submitting}
            onClick={() =>
              reason &&
              run(
                () => onWithdraw(reason),
                () => setConfirmOpen(false),
              )
            }
          >
            탈퇴 신청
          </Button>
        </Group>
      </Modal>
    </Stack>
  )
}

export function AccountView({
  tab,
  onTabChange,
  profile,
  onSaveInfo,
  onChangePassword,
  passwordErrors,
  address,
  onSaveAddress,
  onDeleteAddress,
  withdrawBlock = null,
  balance = 0,
  onWithdraw,
  withdrawCompletesAt,
  submitting = false,
  defaultModal = null,
}: AccountViewProps) {
  const [modal, setModal] = useState(defaultModal)
  const close = () => setModal(null)

  return (
    <div className={classes.root}>
      <PageHeader title="계정 관리" backTo="/me" />
      <Tabs value={tab} onChange={(value) => onTabChange((value ?? 'info') as AccountTab)}>
        <Tabs.List aria-label="계정 메뉴">
          {tabs.map((t) => (
            <Tabs.Tab key={t.value} value={t.value}>
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value="info" pt="lg">
          <InfoForm profile={profile} onSave={onSaveInfo} submitting={submitting} />
        </Tabs.Panel>

        <Tabs.Panel value="password" pt="lg">
          <PasswordForm
            onSave={onChangePassword}
            serverErrors={passwordErrors}
            submitting={submitting}
          />
        </Tabs.Panel>

        <Tabs.Panel value="address" pt="lg">
          <Stack gap="sm">
            <Text className={classes.help}>
              배송지는 1개만 저장돼요. 주문서에서 바꾼 배송지는 그 주문에만 적용돼요.
            </Text>
            {address ? (
              <section
                className={`${classes.card} ${classes.addressCard}`}
                aria-label="저장된 배송지"
              >
                <div>
                  <p className="pd-num">
                    <strong>{address.recipientName}</strong> · {address.recipientPhone}
                  </p>
                  <p className="pd-num">
                    ({address.zipCode}) {address.address}
                    {address.addressDetail ? `, ${address.addressDetail}` : ''}
                  </p>
                </div>
                <Group gap="xs">
                  <Button variant="subtle" onClick={() => setModal('address')}>
                    수정
                  </Button>
                  <Button variant="subtle" onClick={() => setModal('deleteAddress')}>
                    삭제
                  </Button>
                </Group>
              </section>
            ) : (
              <div className={classes.card}>
                <EmptyView
                  icon={<MapPin />}
                  title="저장된 배송지가 없어요"
                  description="배송지를 등록하면 주문서에 바로 채워져요."
                  action={{ label: '배송지 등록', onClick: () => setModal('address') }}
                />
              </div>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="withdraw" pt="lg">
          <WithdrawForm
            block={withdrawBlock}
            balance={balance}
            onWithdraw={onWithdraw}
            completesAt={withdrawCompletesAt}
            submitting={submitting}
            defaultOpen={defaultModal === 'withdraw'}
          />
        </Tabs.Panel>
      </Tabs>

      <AddressModal
        opened={modal === 'address'}
        initial={address}
        title={address ? '배송지 수정' : '배송지 등록'}
        help="저장한 배송지는 주문서에 바로 채워져요."
        submitLabel="저장"
        submitting={submitting}
        onClose={close}
        onSave={(next) => run(() => onSaveAddress(next), close)}
      />

      <Modal opened={modal === 'deleteAddress'} onClose={close} title="배송지를 삭제할까요?">
        <Text>
          주문할 때 배송지를 다시 입력해야 해요. 이미 주문한 상품의 배송지는 바뀌지 않아요.
        </Text>
        <Group justify="flex-end" gap="xs" mt="lg">
          <Button variant="outline" onClick={close}>
            닫기
          </Button>
          <Button color="red" loading={submitting} onClick={() => run(onDeleteAddress, close)}>
            삭제
          </Button>
        </Group>
      </Modal>
    </div>
  )
}

const notConnectedTabs: Record<Exclude<AccountTab, 'info'>, { title: string; api: string }> = {
  password: {
    title: '비밀번호 변경은 아직 연결되지 않았어요',
    api: '❌ POST /members/me/password',
  },
  address: { title: '배송지 관리는 아직 연결되지 않았어요', api: '❌ 배송지 GET/PUT/DELETE' },
  withdraw: {
    title: '회원 탈퇴는 아직 연결되지 않았어요',
    api: '❌ POST /members/me/withdrawal',
  },
}

export type AccountInfoPanelProps = {
  status: 'pending' | 'error' | 'success'
  profile?: MyProfile
  onSave: InfoFormProps['onSave']
  submitting?: boolean
  serverErrors?: InfoFormProps['serverErrors']
  errorMessage?: string
  saved?: boolean
  /** 내 정보를 못 받았을 때의 문구 */
  loadErrorMessage?: string
  onRetry?: () => void
}

/** 내 정보 탭: ✅ GET·PUT /members/me. 아이디·이메일은 읽기 전용 */
export function AccountInfoPanel({
  status,
  profile,
  onSave,
  submitting = false,
  serverErrors,
  errorMessage,
  saved,
  loadErrorMessage,
  onRetry,
}: AccountInfoPanelProps) {
  return (
    <QueryState
      status={status === 'success' && !profile ? 'pending' : status}
      skeleton={<Skeleton h={260} radius="md" />}
      loadingLabel="내 정보를 불러오고 있어요"
      errorMessage={loadErrorMessage}
      onRetry={onRetry}
    >
      {profile && (
        <InfoForm
          key={`${profile.name}/${profile.nickname}`}
          profile={profile}
          onSave={onSave}
          submitting={submitting}
          serverErrors={serverErrors}
          errorMessage={errorMessage}
          saved={saved}
        />
      )}
    </QueryState>
  )
}

/** 지금 라우트가 그리는 계정 관리: 내 정보 탭은 실제, 나머지 탭은 ‘연결 전’ */
export function AccountNotConnectedView({
  tab,
  onTabChange,
  info,
}: Pick<AccountViewProps, 'tab' | 'onTabChange'> & { info: AccountInfoPanelProps }) {
  return (
    <div className={classes.root}>
      <PageHeader title="계정 관리" backTo="/me" />
      <Tabs value={tab} onChange={(value) => onTabChange((value ?? 'info') as AccountTab)}>
        <Tabs.List aria-label="계정 메뉴">
          {tabs.map((t) => (
            <Tabs.Tab key={t.value} value={t.value}>
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {tabs.map((t) => (
          <Tabs.Panel key={t.value} value={t.value} pt="lg">
            {t.value === 'info' ? (
              <AccountInfoPanel {...info} />
            ) : (
              <NotConnected
                title={notConnectedTabs[t.value].title}
                api={notConnectedTabs[t.value].api}
              />
            )}
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  )
}
