import { Button, Group, Modal, Text } from '@mantine/core'
import { useState } from 'react'
import { AUTO_CONFIRM_DAYS } from '@/shared/lib/constants'

// 구매확정 버튼 + 확인 창. 확정하면 되돌릴 수 없고(리뷰 쓰기·정산이 열린다) 환불 요청을 할 수 없게 되므로 한 번 더 묻는다.
// 창을 닫으면 Mantine이 연 버튼으로 focus를 돌려놓는다.

export type ConfirmItemButtonProps = {
  productName: string
  loading?: boolean
  onConfirm: () => void
}

export function ConfirmItemButton({
  productName,
  loading = false,
  onConfirm,
}: ConfirmItemButtonProps) {
  const [opened, setOpened] = useState(false)
  return (
    <>
      <Button
        size="sm"
        loading={loading}
        aria-label={`${productName} 구매확정`}
        onClick={() => setOpened(true)}
      >
        구매확정
      </Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="구매확정할까요?" centered>
        <Text>{productName}</Text>
        <Text size="sm" c="dimmed" mt="xs">
          구매확정하면 되돌릴 수 없어요. 상품을 받고 문제가 없을 때 눌러 주세요. 누르지 않아도 배송
          완료 {AUTO_CONFIRM_DAYS}일 뒤에 자동으로 구매확정돼요.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setOpened(false)}>
            취소
          </Button>
          <Button
            onClick={() => {
              setOpened(false)
              onConfirm()
            }}
          >
            구매확정
          </Button>
        </Group>
      </Modal>
    </>
  )
}
