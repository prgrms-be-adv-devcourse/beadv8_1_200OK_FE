import {
  Alert,
  Button,
  Group,
  Modal,
  NativeSelect,
  Radio,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { CircleAlert, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { formatDate, formatPrice } from '@/shared/lib/format'
import { DisabledReason } from '@/shared/ui'
import { CARRIERS, delayReasonLabels, sellerCancelReasonLabels } from '../labels'
import { DelayReason, SellerCancelReason, type SellerOrderRow } from '../types'
import classes from './OrderModals.module.css'

// 주문·출고 화면의 모달 4개. 시안: seller/SellerOrders (송장 등록 · 배송지 변경 요청 · 판매자 취소 · 출고 지연)
// TODO(api): 📝 송장 POST /shipments/seller/{id}/dispatch, 지연 .../delay, 판매자 취소 POST /claims/seller/cancel, 배송지 변경 승인(API 미정)

export type InvoiceInput = { carrier: string; trackingNumber: string }
export type DelayInput = { reason: DelayReason; reasonDetail?: string; newShipDate: string }
export type SellerCancelInput = { reason: SellerCancelReason; reasonDetail?: string }

function Summary({ order }: { order: SellerOrderRow }) {
  return (
    <Text className={`pd-num ${classes.summary}`}>
      {order.orderNumber} · {order.buyerNickname} · {order.productName} {order.itemText}
    </Text>
  )
}

// ─── 송장 등록 ───────────────────────────────────────────

export function InvoiceModal({
  order,
  onClose,
  onSubmit,
  submitting,
}: {
  order: SellerOrderRow | null
  onClose: () => void
  onSubmit: (input: InvoiceInput) => void
  submitting?: boolean
}) {
  return (
    <Modal opened={order !== null} onClose={onClose} title="송장 등록">
      {order && (
        <InvoiceForm order={order} onClose={onClose} onSubmit={onSubmit} submitting={submitting} />
      )}
    </Modal>
  )
}

function InvoiceForm({
  order,
  onClose,
  onSubmit,
  submitting,
}: {
  order: SellerOrderRow
  onClose: () => void
  onSubmit: (input: InvoiceInput) => void
  submitting?: boolean
}) {
  const [carrier, setCarrier] = useState<string>(CARRIERS[0])
  const [trackingNumber, setTrackingNumber] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const digits = trackingNumber.replace(/[\s-]/g, '')
    if (!digits) return setError('송장번호를 입력해 주세요')
    if (!/^\d{9,14}$/.test(digits)) return setError('송장번호는 숫자 9~14자리로 입력해 주세요')
    onSubmit({ carrier, trackingNumber: digits })
  }

  return (
    <Stack gap="md">
      <Summary order={order} />
      <NativeSelect
        label="택배사"
        data={[...CARRIERS]}
        value={carrier}
        onChange={(e) => setCarrier(e.currentTarget.value)}
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
      </Alert>
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

export function AddressRequestModal({
  order,
  onClose,
  onAnswer,
  submitting,
}: {
  order: SellerOrderRow | null
  onClose: () => void
  onAnswer: (approve: boolean) => void
  submitting?: boolean
}) {
  const change = order?.addressChange
  return (
    <Modal opened={order !== null} onClose={onClose} title="배송지 변경 요청">
      {order && change && (
        <Stack gap="md">
          <Text className={`pd-num ${classes.summary}`}>
            {order.orderNumber} · {order.buyerNickname} ·{' '}
            {formatDate(change.requestedAt, 'dateTime')} 요청
          </Text>
          <dl className={classes.compare}>
            <div>
              <dt>변경 전</dt>
              <dd>{order.address}</dd>
            </div>
            <div data-after>
              <dt>변경 후</dt>
              <dd>{change.after}</dd>
            </div>
          </dl>
          <Text className={classes.help}>
            받는 분·연락처는 같아요. 승인하면 바뀐 주소로 보내야 해요. 거절하면 원래 주소로 보내요.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="outline" onClick={() => onAnswer(false)} disabled={submitting}>
              거절
            </Button>
            <Button onClick={() => onAnswer(true)} loading={submitting}>
              승인
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}

// ─── 판매자 취소 ─────────────────────────────────────────

export function SellerCancelModal({
  order,
  onClose,
  onSubmit,
  submitting,
}: {
  order: SellerOrderRow | null
  onClose: () => void
  onSubmit: (input: SellerCancelInput) => void
  submitting?: boolean
}) {
  return (
    <Modal opened={order !== null} onClose={onClose} title="판매자 취소">
      {order && (
        <SellerCancelForm
          order={order}
          onClose={onClose}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      )}
    </Modal>
  )
}

function SellerCancelForm({
  order,
  onClose,
  onSubmit,
  submitting,
}: {
  order: SellerOrderRow
  onClose: () => void
  onSubmit: (input: SellerCancelInput) => void
  submitting?: boolean
}) {
  const [reason, setReason] = useState<SellerCancelReason | null>(null)
  const [detail, setDetail] = useState('')
  const disabledReason = !reason
    ? '취소 사유를 골라 주세요'
    : reason === SellerCancelReason.ETC && !detail.trim()
      ? '구매자에게 보여 줄 사유를 적어 주세요'
      : null

  return (
    <Stack gap="md">
      <Summary order={order} />
      <Radio.Group
        label="취소 사유"
        value={reason}
        onChange={(v) => setReason(v as SellerCancelReason)}
      >
        <Stack gap="xs" mt="xs">
          {Object.values(SellerCancelReason).map((value) => (
            <Radio key={value} value={value} label={sellerCancelReasonLabels[value]} />
          ))}
        </Stack>
      </Radio.Group>
      {reason === SellerCancelReason.ETC && (
        <Textarea
          aria-label="기타 취소 사유"
          placeholder="구매자에게 보여 줄 사유를 적어 주세요"
          autosize
          minRows={2}
          maxLength={200}
          value={detail}
          onChange={(e) => setDetail(e.currentTarget.value)}
        />
      )}
      <Alert color="info" icon={<CircleAlert />}>
        <span className="pd-num">
          판매자가 취소하면 바로 환불돼요. 구매자에게 <strong>{formatPrice(order.amount)}</strong>이
          예치금으로 돌아가요.
        </span>
      </Alert>
      <Group justify="flex-end" gap="xs" align="flex-start">
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
        <DisabledReason reason={disabledReason}>
          <Button
            color="red"
            disabled={disabledReason !== null}
            loading={submitting}
            onClick={() =>
              reason &&
              onSubmit({
                reason,
                ...(reason === SellerCancelReason.ETC ? { reasonDetail: detail.trim() } : {}),
              })
            }
          >
            판매자 취소
          </Button>
        </DisabledReason>
      </Group>
    </Stack>
  )
}

// ─── 출고 지연 알리기 ────────────────────────────────────

export function DelayModal({
  order,
  today,
  onClose,
  onSubmit,
  submitting,
}: {
  order: SellerOrderRow | null
  today: Date
  onClose: () => void
  onSubmit: (input: DelayInput) => void
  submitting?: boolean
}) {
  return (
    <Modal opened={order !== null} onClose={onClose} title="출고 지연 알리기">
      {order && (
        <DelayForm
          order={order}
          today={today}
          onClose={onClose}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      )}
    </Modal>
  )
}

/** 로컬 날짜 그대로 YYYY-MM-DD (toISOString은 UTC라 하루 밀릴 수 있다) */
function toDateParam(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function reasonOf(label: string | undefined): DelayReason | null {
  if (!label) return null
  return Object.values(DelayReason).find((r) => delayReasonLabels[r] === label) ?? DelayReason.ETC
}

function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function DelayForm({
  order,
  today,
  onClose,
  onSubmit,
  submitting,
}: {
  order: SellerOrderRow
  today: Date
  onClose: () => void
  onSubmit: (input: DelayInput) => void
  submitting?: boolean
}) {
  const [reason, setReason] = useState<DelayReason | null>(reasonOf(order.delay?.reason))
  const [detail, setDetail] = useState('')
  const [date, setDate] = useState<Date | null>(
    order.delay ? new Date(order.delay.newShipDate) : null,
  )
  const past = date !== null && startOfDay(date) < startOfDay(today)
  const disabledReason = !reason
    ? '지연 사유를 골라 주세요'
    : reason === DelayReason.ETC && !detail.trim()
      ? '구매자에게 보여 줄 사유를 적어 주세요'
      : !date
        ? '새 출고 예정일을 골라 주세요'
        : past
          ? '오늘이나 그 뒤 날짜를 골라 주세요'
          : null
  const reasonText =
    reason === DelayReason.ETC ? detail.trim() || '기타' : reason ? delayReasonLabels[reason] : '—'

  return (
    <Stack gap="md">
      <Summary order={order} />
      {order.delay && (
        <Text className={classes.help}>
          이미 알린 지연이 있어요. 다시 알리면 새 내용으로 바뀌어요.
        </Text>
      )}
      <Radio.Group label="지연 사유" value={reason} onChange={(v) => setReason(v as DelayReason)}>
        <Stack gap="xs" mt="xs">
          {Object.values(DelayReason).map((value) => (
            <Radio key={value} value={value} label={delayReasonLabels[value]} />
          ))}
        </Stack>
      </Radio.Group>
      {reason === DelayReason.ETC && (
        <Textarea
          aria-label="기타 지연 사유"
          placeholder="구매자에게 보여 줄 사유를 적어 주세요"
          autosize
          minRows={2}
          maxLength={200}
          value={detail}
          onChange={(e) => setDetail(e.currentTarget.value)}
        />
      )}
      <DatePickerInput
        label="새 출고 예정일"
        valueFormat="YYYY.MM.DD(ddd)"
        minDate={startOfDay(today)}
        value={date}
        onChange={(v) => setDate(v ? new Date(v) : null)}
        error={
          past
            ? `오늘(${formatDate(today, 'monthDay')})보다 이전 날짜는 고를 수 없어요. 오늘이나 그 뒤 날짜를 골라 주세요`
            : undefined
        }
      />
      <div className={classes.previewBox}>
        <span className={classes.previewLabel}>구매자에게 이렇게 보여요</span>
        <Alert color="warning" icon={<CircleAlert />} title="판매자가 출고 지연을 알렸어요">
          <dl className={classes.delayPreview}>
            <div>
              <dt>지연 사유</dt>
              <dd>{reasonText}</dd>
            </div>
            <div>
              <dt>새 출고 예정일</dt>
              <dd className="pd-num">{date ? formatDate(date, 'monthDayWeek') : '—'}</dd>
            </div>
          </dl>
        </Alert>
        <Text className={classes.help}>
          구매자의 배송 조회 화면에 보여요. 구매자는 송장 등록 전까지 취소를 요청할 수 있어요.
        </Text>
      </div>
      <Group justify="flex-end" gap="xs" align="flex-start">
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
        <DisabledReason reason={disabledReason}>
          <Button
            disabled={disabledReason !== null}
            loading={submitting}
            onClick={() =>
              reason &&
              date &&
              onSubmit({
                reason,
                ...(reason === DelayReason.ETC ? { reasonDetail: detail.trim() } : {}),
                newShipDate: toDateParam(date),
              })
            }
          >
            지연 알리기
          </Button>
        </DisabledReason>
      </Group>
    </Stack>
  )
}
