import { Button } from '@mantine/core'
import { Check } from 'lucide-react'

// 농가 팔로우 버튼. 팔로우 전: Secondary(outline) ‘팔로우’ / 팔로잉: tint 바탕 + 체크 ‘팔로잉’. 높이 44
// 문구가 상태를 말하므로 aria-pressed는 두지 않는다(이름과 상태가 겹쳐 읽히지 않게).
// 시안: b2c/Home(단골이 많은 농가), b2c/Main, b2c/Store

export type FollowButtonProps = {
  following: boolean
  onClick: () => void
  /** 처리 중 (중복 클릭 막기) */
  loading?: boolean
}

export function FollowButton({ following, onClick, loading }: FollowButtonProps) {
  return following ? (
    <Button
      variant="light"
      leftSection={<Check size={16} aria-hidden="true" />}
      onClick={onClick}
      loading={loading}
    >
      팔로잉
    </Button>
  ) : (
    <Button variant="outline" onClick={onClick} loading={loading}>
      팔로우
    </Button>
  )
}
