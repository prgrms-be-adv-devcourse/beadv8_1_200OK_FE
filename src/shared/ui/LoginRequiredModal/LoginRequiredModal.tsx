import { Button, Group, Modal, Text } from '@mantine/core'
import { Link, useLocation } from 'react-router'
import { loginPath } from '@/shared/lib/returnTo'

// 비회원이 담기·관심·팔로우를 눌렀을 때 띄우는 안내 모달. 닫기(Secondary) → 로그인하기(Primary, 지금 화면으로 돌아오기)
// 시안: b2c/Home·Main·Store의 ‘로그인이 필요해요’ 모달

export type LoginReason = 'cart' | 'like' | 'follow'

const messages: Record<LoginReason, string> = {
  cart: '로그인하고 장바구니에 담아 보세요.',
  like: '로그인하고 관심 상품을 모아 보세요.',
  follow: '로그인하고 농가를 팔로우해 보세요.',
}

export type LoginRequiredModalProps = {
  /** 띄운 이유. null이면 닫힘 */
  reason: LoginReason | null
  onClose: () => void
}

export function LoginRequiredModal({ reason, onClose }: LoginRequiredModalProps) {
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`

  return (
    <Modal opened={reason !== null} onClose={onClose} title="로그인이 필요해요">
      <Text c="var(--pd-color-text-secondary)">{reason && messages[reason]}</Text>
      <Group justify="flex-end" gap="xs" mt="lg">
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
        <Button component={Link} to={loginPath(returnTo)}>
          로그인하기
        </Button>
      </Group>
    </Modal>
  )
}
