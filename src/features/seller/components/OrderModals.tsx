import {
  Alert,
  Button,
  Group,
  Modal,
  NativeSelect,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import {
  type SellerShipmentSummary,
  type ShipmentAddress,
  ShipmentCarrier,
  type ShipmentDetail,
  type ShipmentDispatchRequest,
} from '@/shared/api/types'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { carrierLabels } from '@/shared/lib/labels'
import { CARRIER_ORDER } from '../labels'
import classes from './OrderModals.module.css'

// 주문·출고 화면의 모달 2개. 시안: seller/SellerOrders (송장 등록 · 배송지 변경 요청)
// ✅ 출고 POST /seller/shipments/{shipmentId}/dispatch {carrier, trackingNumber 숫자 10~13자리} (같은 택배사 안에서 중복 불가),
//    배송지 변경 승인·거절 PATCH /seller/shipments/{shipmentId}/address-change-requests/{requestId} {decision: APPROVE|REJECT}.
// 서버가 거절한 이유(409 중복 송장·상태 변경·이미 처리, 422)는 error로 받아 모달 안에 그대로 보여 준다.
// TODO(api): ❌ 출고 지연 알리기 · 판매자 취소 API 없음 → 모달을 두지 않는다(화면에 연결 전 안내).

export type InvoiceInput = ShipmentDispatchRequest

function Summary({ shipment }: { shipment: SellerShipmentSummary }) {
  return (
    <Text className={`pd-num ${classes.summary}`}>
      주문 {shipment.orderId} · {shipment.recipientName} · {shipment.representativeProductName}
      {shipment.otherItemCount > 0 ? ` 외 ${shipment.otherItemCount}건` : ''}
    </Text>
  )
}

// ─── 송장 등록 ───────────────────────────────────────────

export function InvoiceModal({
  shipment,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  shipment: SellerShipmentSummary | null
  onClose: () => void
  onSubmit: (input: InvoiceInput) => void
  submitting?: boolean
  /** 서버가 거절한 이유 */
  error?: string | null
}) {
  return (
    <Modal opened={shipment !== null} onClose={onClose} title="송장 등록">
      {shipment && (
        <InvoiceForm
          shipment={shipment}
          onClose={onClose}
          onSubmit={onSubmit}
          submitting={submitting}
          error={error}
        />
      )}
    </Modal>
  )
}

function InvoiceForm({
  shipment,
  onClose,
  onSubmit,
  submitting,
  error: serverError,
}: {
  shipment: SellerShipmentSummary
  onClose: () => void
  onSubmit: (input: InvoiceInput) => void
  submitting?: boolean
  error?: string | null
}) {
  const [carrier, setCarrier] = useState<ShipmentCarrier>(
    CARRIER_ORDER[0] ?? ShipmentCarrier.CJ_LOGISTICS,
  )
  const [trackingNumber, setTrackingNumber] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const digits = trackingNumber.replace(/[\s-]/g, '')
    if (!digits) return setError('송장번호를 입력해 주세요')
    // 서버 규칙(ShipmentDispatchRequest): 숫자 10~13자리
    if (!/^\d{10,13}$/.test(digits)) return setError('송장번호는 숫자 10~13자리로 입력해 주세요')
    onSubmit({ carrier, trackingNumber: digits })
  }

  return (
    <Stack gap="md">
      <Summary shipment={shipment} />
      <NativeSelect
        label="택배사"
        data={CARRIER_ORDER.map((value) => ({ value, label: carrierLabels[value] }))}
        value={carrier}
        onChange={(e) => setCarrier(e.currentTarget.value as ShipmentCarrier)}
      />
      <TextInput
        label="송장번호"
        inputMode="numeric"
        placeholder="숫자만 입력해 주세요"
        classNames={{ input: 'pd-num' }}
        value={trackingNumber}
        onChange={(e) => {
          setTrackingNumber(e.currentTarget.value)
          setError(null)
        }}
        error={error}
        data-autofocus
      />
      <Alert color="warning" icon={<TriangleAlert />}>
        송장을 등록하면 구매자가 더 이상 취소할 수 없어요
        {shipment.addressChangePending &&
          '. 대기 중인 배송지 변경 요청은 자동으로 거절돼요. 바꿔 보내려면 먼저 요청을 승인해 주세요'}
      </Alert>
      {serverError && (
        <Alert color="error" role="alert">
          {serverError}
        </Alert>
      )}
      <Group justify="flex-end" gap="xs">
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
        <Button loading={submitting} onClick={submit}>
          송장 등록
        </Button>
      </Group>
    </Stack>
  )
}

// ─── 배송지 변경 요청 ────────────────────────────────────

const addressLine = (address: ShipmentAddress) =>
  `(${address.postalCode}) ${address.address}${address.addressDetail ? `, ${address.addressDetail}` : ''}`

export type AddressRequestModalProps = {
  /** 열 출고. null이면 닫혀 있다 */
  shipment: SellerShipmentSummary | null
  /** 출고 상세 조회 상태. 대기 중인 요청(latestAddressChange)은 상세에만 있다 */
  detailStatus: 'pending' | 'error' | 'success'
  detail?: ShipmentDetail
  onRetry?: () => void
  onClose: () => void
  onAnswer: (requestId: number, approve: boolean) => void
  submitting?: boolean
  /** 서버가 거절한 이유 (이미 처리됐거나 출고 전이 아님) */
  error?: string | null
}

export function AddressRequestModal({
  shipment,
  detailStatus,
  detail,
  onRetry,
  onClose,
  onAnswer,
  submitting,
  error,
}: AddressRequestModalProps) {
  const change = detail?.latestAddressChange
  const pending = change?.status === 'PENDING' ? change : null
  return (
    <Modal opened={shipment !== null} onClose={onClose} title="배송지 변경 요청">
      {shipment && (
        <Stack gap="md">
          <Summary shipment={shipment} />
          {detailStatus === 'pending' && <Skeleton h={120} />}
          {detailStatus === 'error' && (
            <Alert color="error" role="alert">
              요청 내용을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.
              {onRetry && (
                <Button variant="outline" size="sm" mt="xs" onClick={onRetry}>
                  다시 시도
                </Button>
              )}
            </Alert>
          )}
          {detailStatus === 'success' && detail && !pending && (
            <Alert color="info">이미 처리된 요청이에요. 목록을 새로 불러왔어요.</Alert>
          )}
          {detail && pending && (
            <>
              <Text className={`pd-num ${classes.summary}`}>
                {formatDate(pending.requestedAt, 'dateTime')} 요청
              </Text>
              <dl className={classes.compare}>
                <div>
                  <dt>변경 전</dt>
                  <dd>{addressLine(detail.address)}</dd>
                </div>
                <div data-after>
                  <dt>변경 후</dt>
                  <dd>{addressLine(pending.requestedAddress)}</dd>
                </div>
              </dl>
              {pending.additionalFeeNotice > 0 && (
                <Text className={classes.help}>
                  바뀐 주소로 보내면 추가 운임 {formatAmount(pending.additionalFeeNotice)}원이
                  늘어요. 앱에서 결제하지 않으니 구매자에게 직접 받아 주세요.
                </Text>
              )}
              <Text className={classes.help}>
                승인하면 바뀐 주소로 보내야 해요. 거절하면 원래 주소로 보내요.
              </Text>
            </>
          )}
          {error && (
            <Alert color="error" role="alert">
              {error}
            </Alert>
          )}
          <Group justify="flex-end" gap="xs">
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
            {pending && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onAnswer(pending.requestId, false)}
                  disabled={submitting}
                >
                  거절
                </Button>
                <Button onClick={() => onAnswer(pending.requestId, true)} loading={submitting}>
                  승인
                </Button>
              </>
            )}
          </Group>
        </Stack>
      )}
    </Modal>
  )
}
