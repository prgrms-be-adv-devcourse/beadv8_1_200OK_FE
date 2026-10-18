import type { MemberRole } from '@/shared/api/types'

// 테스트용 가짜 accessToken (서명 없음). 서버 토큰과 같은 payload 모양: sub · role · exp(초)
export function fakeToken({
  memberId = 2,
  role,
  expiresInSec = 1800,
}: {
  memberId?: number
  role: MemberRole
  expiresInSec?: number
}) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  const exp = Math.floor(Date.now() / 1000) + expiresInSec
  return `${encode({ alg: 'HS256' })}.${encode({ sub: String(memberId), role, exp })}.signature`
}
