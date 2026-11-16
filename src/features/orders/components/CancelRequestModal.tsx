import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core'
import { useState } from 'react'
import { REFUND_REASON_MAX_LENGTH } from '@/shared/api/refund'
import type { OrderDetailItem } from '@/shared/api/types'
import { formatAmount } from '@/shared/lib/format'
import { PriceText, QuantityStepper } from '@/shared/ui'

// 출고 전 취소 요청 창: 개수(1 ~ 취소할 수 있는 개수) + 사유(선택).
// 판매자가 승인해야 환불되고, 배송비는 승인할 때 정해져서 여기서는 상품 금액만 보여 준다.
// 서버가 거절하면(이 상품만 취소할 수 없음 등) 창을 열어 두고 그 문구를 보여 준다. 닫으면 Mantine이 연 버튼으로 focus를 돌려놓는다.

export type CancelRequestModalProps = {
  item: OrderDetailItem | null
  maxQuantity: number
  onClose: () => void
  /** 성공하면 null(창을 닫는다), 실패하면 오류 문구(창을 열어 둔다) */
  onSubmit: (quantity: number, cancelReason: string) => Promise<string | null>
  submitting?: boolean
}

export function CancelRequestModal({
  item,
  maxQuantity,
  onClose,
  onSubmit,
  submitting = false,
}: CancelRequestModalProps) {
  return (
    <Modal opened={item !== null} onClose={onClose} title="취소를 요청할까요?" centered>
      {item && (
        <CancelRequestForm
          key={item.orderItemId}
          item={item}
          maxQuantity={maxQuantity}
          onClose={onClose}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      )}
    </Modal>
  )
}

function CancelRequestForm({
  item,
  maxQuantity,
  onClose,
  onSubmit,
  submitting,
}: Omit<CancelRequestModalProps, 'item'> & { item: OrderDetailItem }) {
  const [quantity, setQuantity] = useState(maxQuantity)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <Stack gap="md">
      <div>
        <Text fw={600}>{item.productName}</Text>
        <Text size="sm" c="dimmed" className="pd-num">
          {item.productOptionName} · {formatAmount(item.quantity)}개 주문
        </Text>
      </div>
      {maxQuantity > 1 && (
        <Group justify="space-between">
          <Text size="sm">취소할 개수</Text>
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            max={maxQuantity}
            label={`${item.productName} 취소할 개수`}
            maxHelp="취소할 수 있는 개수를 모두 골랐어요"
          />
        </Group>
      )}
      <Group justify="space-between">
        <Text size="sm">상품 금액</Text>
        <PriceText amount={item.unitPrice * quantity} size="S" />
      </Group>
      <Textarea
        label="취소 사유 (선택)"
        description="판매자가 보고 승인할지 정해요"
        placeholder="예: 옵션을 잘못 골랐어요"
        autosize
        minRows={2}
        maxLength={REFUND_REASON_MAX_LENGTH}
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value)}
      />
      <Text size="sm" c="dimmed">
        판매자가 승인하면 예치금으로 환불돼요. 배송비는 승인할 때 정해져요. 묶음 상품을 모두
        취소하면 낸 배송비도 돌려받고, 일부만 취소해 무료배송 기준 아래로 내려가면 배송비를 빼요.
      </Text>
      {error && (
        <Text role="alert" c="error" size="sm">
          {error}
        </Text>
      )}
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={onClose}>
          닫기
        </Button>
        <Button
          loading={submitting}
          onClick={async () => {
            setError(null)
            const failure = await onSubmit(quantity, reason.trim())
            if (failure === null) onClose()
            else setError(failure)
          }}
        >
          취소 요청
        </Button>
      </Group>
    </Stack>
  )
}
