import { useSyncExternalStore } from 'react'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import type { MemberRole } from '@/shared/api/types'

// 가드·헤더가 읽는 로그인 상태. 내 정보 API가 없어 로그인 토큰 payload(sub · role)로 판단한다(DECISIONS.md A-12).
// 토큰은 sessionStorage에도 두어 새로고침해도 유지되고, 탭을 닫으면 guest가 된다. 닉네임은 내 정보(GET /members/me, shared/api/memberInfo.ts)를 따로 조회해 쓴다.
// 'unknown'은 내 정보 조회처럼 확인 중인 상태용으로 남겨 둔다(지금은 만들지 않는다). 가드는 통과시킨다.

export type Session =
  | { status: 'unknown' }
  | { status: 'guest' }
  | { status: 'authenticated'; role: MemberRole; memberId?: number; nickname?: string }

const GUEST: Session = { status: 'guest' }
const cache = new WeakMap<object, Session>()

export function useSession(): Session {
  const auth = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)
  if (!auth) return GUEST
  let session = cache.get(auth)
  if (!session) {
    session = { status: 'authenticated', role: auth.role, memberId: auth.memberId }
    cache.set(auth, session)
  }
  return session
}
