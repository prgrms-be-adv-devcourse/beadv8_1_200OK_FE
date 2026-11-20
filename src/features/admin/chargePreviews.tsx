import { ChargeStatus } from '@/shared/api/types'
import type { ScreenPreview } from '@/shared/lib/screenPreview'
import {
  type AdminCharge,
  type AdminChargeDetail,
  CHARGE_CANCEL_RETRY_SAFE,
  CHARGE_TOSS_UNAVAILABLE_MESSAGE,
  ChargeAction,
  TossPaymentStatus,
} from './charges'
import {
  adminCharges,
  CHARGE_AFTER_FAILURE,
  CHARGE_CANCEL_REQUESTED,
  CHARGE_DONE,
  CHARGE_NOT_FOUND,
  CHARGE_UNKNOWN,
  findChargeDetail,
} from './fixtures'
import {
  AdminChargeDetailView,
  type AdminChargeDetailViewProps,
} from './views/AdminChargeDetailView'
import { AdminChargesView, type AdminChargesViewProps } from './views/AdminChargesView'

// M-05 멈춘 충전 건 화면 상태 (previews.tsx의 adminPreviews에 이어 붙인다)

const noop = () => {}

const listView = (props: Partial<AdminChargesViewProps> = {}) => (
  <AdminChargesView
    status="success"
    charges={adminCharges}
    onRefresh={noop}
    onRetry={noop}
    {...props}
  />
)

const detailOf = (chargeNo: string) => findChargeDetail(chargeNo) as AdminChargeDetail
const done = detailOf(CHARGE_DONE)

const detailView = (
  detail: AdminChargeDetail | null,
  props: Partial<AdminChargeDetailViewProps> = {},
) => (
  <AdminChargeDetailView
    status="success"
    detail={detail}
    onRetry={noop}
    onRefresh={noop}
    onComplete={noop}
    onFail={noop}
    onCancelPayment={noop}
    {...props}
  />
)

const withToss = (
  detail: AdminChargeDetail,
  toss: Partial<Omit<AdminChargeDetail, 'charge'>>,
): AdminChargeDetail => ({ ...detail, ...toss })

const withCharge = (
  detail: AdminChargeDetail,
  charge: Partial<AdminChargeDetail['charge']>,
): AdminChargeDetail => ({ ...detail, charge: { ...detail.charge, ...charge } })

const manyCharges = Array.from({ length: 100 }, (_, i) => ({
  ...(adminCharges[i % 2] as AdminCharge),
  chargeNo: `CHG_${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`,
}))

const DETAIL_PATH = '/admin/charges/detail'

export const chargePreviews: ScreenPreview[] = [
  {
    id: 'admin-charges',
    title: 'M-05 충전 처리 목록',
    pageTitle: '충전 처리',
    layout: 'admin',
    path: '/admin/charges',
    states: [
      { id: 'default', label: '멈춘 건 · 승인 뒤 실패한 건', render: () => listView() },
      {
        id: 'held-only',
        label: '멈춘 건만',
        render: () =>
          listView({ charges: adminCharges.filter((c) => c.status === ChargeStatus.IN_PROGRESS) }),
      },
      { id: 'refreshing', label: '다시 불러오는 중', render: () => listView({ refreshing: true }) },
      { id: 'limit', label: '100건 (상한)', render: () => listView({ charges: manyCharges }) },
      { id: 'empty', label: '처리할 건 없음', render: () => listView({ charges: [] }) },
      { id: 'loading', label: '로딩', render: () => listView({ status: 'pending', charges: [] }) },
      {
        id: 'error',
        label: '불러오기 실패',
        render: () =>
          listView({
            status: 'error',
            charges: [],
            errorMessage: '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요',
          }),
      },
    ],
  },
  {
    id: 'admin-charge-detail',
    title: 'M-05 충전 건 처리 상세',
    pageTitle: '충전 처리',
    layout: 'admin',
    path: DETAIL_PATH,
    states: [
      { id: 'done', label: '토스 승인 · 잔액 반영/결제 취소', render: () => detailView(done) },
      {
        id: 'not-found',
        label: '토스 결제 없음 · 실패 처리',
        render: () => detailView(detailOf(CHARGE_NOT_FOUND)),
      },
      {
        id: 'aborted',
        label: '토스 승인 실패 · 실패 처리',
        render: () =>
          detailView(
            withToss(done, { tossStatus: TossPaymentStatus.ABORTED, tossTotalAmount: 10_000 }),
          ),
      },
      {
        id: 'toss-canceled',
        label: '토스에서 이미 취소 · 기록만',
        render: () => detailView(withToss(done, { tossStatus: TossPaymentStatus.CANCELED })),
      },
      {
        id: 'amount-mismatch',
        label: '토스 금액이 다름',
        render: () => detailView(withToss(done, { tossTotalAmount: 9_000 })),
      },
      {
        id: 'toss-in-progress',
        label: '토스 승인 전 (모두 꺼짐)',
        render: () => detailView(withToss(done, { tossStatus: TossPaymentStatus.IN_PROGRESS })),
      },
      {
        id: 'cancel-requested',
        label: '취소 결과 모름 · 결제 취소만',
        render: () => detailView(detailOf(CHARGE_CANCEL_REQUESTED)),
      },
      {
        id: 'after-failure',
        label: '승인 뒤 실패 · 결제 취소',
        render: () => detailView(detailOf(CHARGE_AFTER_FAILURE)),
      },
      {
        id: 'unknown',
        label: '토스 답 없음 · 다시 조회만',
        render: () => detailView(detailOf(CHARGE_UNKNOWN)),
      },
      {
        id: 'refreshing',
        label: '다시 조회 중',
        render: () => detailView(detailOf(CHARGE_UNKNOWN), { refreshing: true }),
      },
      {
        id: 'completing',
        label: '잔액 반영 중',
        render: () => detailView(done, { submitting: ChargeAction.COMPLETE }),
      },
      {
        id: 'fail-modal',
        label: '실패 처리 사유',
        render: () => detailView(detailOf(CHARGE_NOT_FOUND), { defaultModal: ChargeAction.FAIL }),
      },
      {
        id: 'fail-422',
        label: '사유 서버 오류(422)',
        render: () =>
          detailView(detailOf(CHARGE_NOT_FOUND), {
            defaultModal: ChargeAction.FAIL,
            defaultReason: ' ',
            reasonError: '사유는 필수입니다.',
          }),
      },
      {
        id: 'cancel-modal',
        label: '결제 취소 사유',
        render: () => detailView(done, { defaultModal: ChargeAction.CANCEL_PAYMENT }),
      },
      {
        id: 'cancel-confirm',
        label: '결제 취소 확인',
        render: () =>
          detailView(done, {
            defaultModal: ChargeAction.CANCEL_PAYMENT,
            defaultModalStep: 'confirm',
            defaultReason: '실패 처리 뒤 승인된 결제라 환불함',
          }),
      },
      {
        id: 'cancel-503',
        label: '결제 취소 503 (모달 유지)',
        render: () =>
          detailView(done, {
            defaultModal: ChargeAction.CANCEL_PAYMENT,
            defaultModalStep: 'confirm',
            defaultReason: '실패 처리 뒤 승인된 결제라 환불함',
            modalError: `${CHARGE_TOSS_UNAVAILABLE_MESSAGE}. ${CHARGE_CANCEL_RETRY_SAFE}`,
          }),
      },
      {
        id: 'conflict',
        label: '409 · 다시 불러옴',
        render: () =>
          detailView(withToss(done, { tossStatus: TossPaymentStatus.CANCELED }), {
            actionError:
              '토스가 같은 금액으로 승인한 결제만 잔액에 반영할 수 있습니다. 토스 결제 상태: CANCELED, 금액: 10000 최신 상태를 다시 불러왔어요.',
          }),
      },
      {
        id: 'completed',
        label: '잔액 반영됨',
        toast: { message: '잔액에 반영했어요' },
        render: () => detailView(withCharge(done, { status: ChargeStatus.COMPLETED })),
      },
      {
        id: 'failed',
        label: '실패 처리됨',
        toast: { message: '실패로 처리했어요' },
        render: () =>
          detailView(
            withCharge(detailOf(CHARGE_NOT_FOUND), {
              status: ChargeStatus.FAILED,
              heldForReview: false,
              failureCode: 'ADMIN_FAILED',
              failureMessage: '토스 결제 확인 결과 승인되지 않음',
            }),
          ),
      },
      {
        id: 'canceled',
        label: '결제 취소됨',
        toast: { message: '결제를 취소했어요. 회원에게 환불돼요' },
        render: () =>
          detailView(
            withToss(
              withCharge(done, {
                status: ChargeStatus.FAILED,
                heldForReview: false,
                failureCode: 'PAYMENT_CANCELED',
                failureMessage: '실패 처리 뒤 승인된 결제라 환불함',
                paymentCancelRequestedAt: '2026-11-20T09:59:58',
                paymentCanceledAt: '2026-11-20T10:00:00',
              }),
              { tossStatus: TossPaymentStatus.CANCELED },
            ),
          ),
      },
      {
        id: 'checking',
        label: '자동 확인 중 (처리 대상 아님)',
        render: () => detailView(withCharge(done, { heldForReview: false })),
      },
      { id: 'loading', label: '로딩', render: () => detailView(null, { status: 'pending' }) },
      {
        id: 'error',
        label: '불러오기 실패',
        render: () =>
          detailView(null, {
            status: 'error',
            errorMessage: '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요',
          }),
      },
      {
        id: 'missing',
        label: '없는 충전 건(404)',
        render: () => detailView(null, { status: 'notFound' }),
      },
    ],
  },
]
