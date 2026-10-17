import type { MemberRole } from '@/shared/api/types'

// 가드·헤더가 읽는 로그인 상태. 내 정보 API가 없어 역할 판단 방법이 아직 정해지지 않았다(DECISIONS.md A-12).
// TODO(api): 2단계 2-0(0-4)에서 features/auth의 useMe() 결과로 바꾼다. 그 전까지는 'unknown'이라
//   가드는 모두 통과시키고, 헤더는 비회원 모양을 그린다.

export type Session =
  | { status: 'unknown' }
  | { status: 'guest' }
  | { status: 'authenticated'; role: MemberRole; nickname?: string }

const UNKNOWN: Session = { status: 'unknown' }

export function useSession(): Session {
  return UNKNOWN
}
