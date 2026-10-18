import { Alert, Button, Checkbox, Group, Modal, Radio, Stack, Text, Textarea } from '@mantine/core'
import { CircleX } from 'lucide-react'
import { useState } from 'react'
import { formatAmount } from '@/shared/lib/format'
import { DisabledReason, PriceText } from '@/shared/ui'
import { cancelReasonLabels } from '../labels'
import { CancelReason, type CancelRequest, type OrderShipment } from '../types'
import classes from './CancelModal.module.css'

// 취소 요청 모달: 같은 농가(배송 묶음) 상품끼리 골라 사유와 함께 요청한다.
// 예상 환불 = 고른 상품 금액 + (묶음 상품을 모두 고르면) 배송비 — 시안의 처리, 정책은 C-3에서 정해야 한다.

export type CancelModalProps = {
  shipment: OrderShipment | null
  onClose: () => void
  onSubmit: (request: CancelRequest) => void
  submitting?: boolean
  /** 서버 오류 (예: 이미 출고된 상품은 취소할 수 없어요) */
  error?: { title: string; message: string } | null
}

function CancelForm({
  shipment,
  onClose,
  onSubmit,
  submitting,
  error,
}: Omit<CancelModalProps, 'shipment'> & { shipment: OrderShipment }) {
  const [picked, setPicked] = useState<Set<number>>(
    new Set(shipment.items.map((item) => item.orderItemId)),
  )
  const [reason, setReason] = useState<CancelReason | null>(null)
  const [detail, setDetail] = useState('')

  const goods = shipment.items
    .filter((item) => picked.has(item.orderItemId))
    .reduce((sum, item) => sum + item.itemAmount, 0)
  const allPicked = picked.size === shipment.items.length
  const shipping = allPicked ? shipment.shippingFee : 0
  const submitReason = error
    ? '이 상품은 더 이상 취소할 수 없어요'
    : picked.size === 0
      ? '취소할 상품을 골라 주세요'
      : !reason
        ? '취소 사유를 골라 주세요'
        : reason === CancelReason.ETC && !detail.trim()
          ? '취소 사유를 적어 주세요'
          : null

  return (
    <Stack gap="md">
      <Text size="sm" c="var(--pd-color-text-muted)">
        {shipment.sellerName} · 같은 농가 상품끼리 함께 요청할 수 있어요
      </Text>
      {error && (
        <Alert color="error" icon={<CircleX />} title={error.title} role="alert">
          {error.message}
        </Alert>
      )}

      <Checkbox.Group
        label="취소할 상품"
        value={[...picked].map(String)}
        onChange={(values) => setPicked(new Set(values.map(Number)))}
      >
        <Stack gap="xs" mt="xs">
          {shipment.items.map((item) => (
            <Checkbox
              key={item.orderItemId}
              value={String(item.orderItemId)}
              label={
                <span className={classes.itemLabel}>
                  <span>
                    {item.productName}{' '}
                    <span className={`pd-num ${classes.help}`}>
                      · {item.optionName} · {formatAmount(item.quantity)}개
                    </span>
                  </span>
                  <PriceText amount={item.itemAmount} size="S" />
                </span>
              }
            />
          ))}
        </Stack>
      </Checkbox.Group>

      <Radio.Group
        label="취소 사유"
        value={reason}
        onChange={(value) => setReason(value as CancelReason)}
      >
        <Stack gap="xs" mt="xs">
          {Object.values(CancelReason).map((value) => (
            <Radio key={value} value={value} label={cancelReasonLabels[value]} />
          ))}
        </Stack>
      </Radio.Group>
      {reason === CancelReason.ETC && (
        <Textarea
          aria-label="기타 취소 사유"
          placeholder="취소 사유를 적어 주세요"
          maxLength={200}
          autosize
          minRows={2}
          value={detail}
          onChange={(event) => setDetail(event.currentTarget.value)}
        />
      )}

      <dl className={classes.refund}>
        <div>
          <dt>상품 금액</dt>
          <dd>
            <PriceText amount={goods} size="S" />
          </dd>
        </div>
        <div>
          <dt>배송비</dt>
          <dd>
            <PriceText amount={shipping} size="S" />
          </dd>
        </div>
        <p className={classes.help}>이 농가 상품을 모두 취소하면 배송비도 함께 돌려드려요</p>
        <div className={classes.total}>
          <dt>예상 환불 금액</dt>
          <dd>
            <PriceText amount={goods + shipping} size="M" />
          </dd>
        </div>
      </dl>
      <Text size="sm">
        판매자가 확인하면 예치금으로 돌려드려요. 확인 전에는 요청을 철회할 수 있어요.
      </Text>

      <Group justify="flex-end" gap="xs" align="flex-start">
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
        <DisabledReason reason={submitReason}>
          <Button
            disabled={submitReason !== null}
            loading={submitting}
            onClick={() =>
              reason &&
              onSubmit({
                shipmentId: shipment.shipmentId,
                orderItemIds: [...picked],
                reason,
                ...(reason === CancelReason.ETC ? { reasonDetail: detail.trim() } : {}),
              })
            }
          >
            취소 요청하기
          </Button>
        </DisabledReason>
      </Group>
    </Stack>
  )
}

export function CancelModal({ shipment, ...props }: CancelModalProps) {
  return (
    <Modal opened={shipment !== null} onClose={props.onClose} title="취소 요청">
      {shipment && <CancelForm key={shipment.shipmentId} shipment={shipment} {...props} />}
    </Modal>
  )
}
