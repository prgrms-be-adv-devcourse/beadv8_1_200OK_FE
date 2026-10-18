import { fakeToken } from '@/test/token'
import {
  clearAccessToken,
  getAuthSession,
  onSessionEnd,
  readTokenClaims,
  setAccessToken,
  subscribeAuth,
} from './authToken'
import { MemberRole } from './types'

afterEach(() => {
  clearAccessToken()
  vi.useRealTimers()
})

describe('authToken', () => {
  it('토큰 payload에서 회원 번호 · 역할 · 만료 시각을 읽는다', () => {
    const claims = readTokenClaims(fakeToken({ memberId: 7, role: MemberRole.SELLER }))
    expect(claims).toMatchObject({ memberId: 7, role: MemberRole.SELLER })
    expect(claims?.expiresAt).toBeGreaterThan(Date.now())
  })

  it('모양이 다르거나 모르는 역할이면 null', () => {
    expect(readTokenClaims('not-a-token')).toBeNull()
    expect(readTokenClaims(fakeToken({ role: 'GUEST' as MemberRole }))).toBeNull()
  })

  it('만료된 토큰은 보관하지 않는다', () => {
    expect(() => setAccessToken(fakeToken({ role: MemberRole.BUYER, expiresInSec: -10 }))).toThrow()
    expect(getAuthSession()).toBeNull()
  })

  it('만료 시각이 되면 세션을 지우고 만료로 알린다', () => {
    vi.useFakeTimers()
    const changed = vi.fn()
    const ended = vi.fn()
    const off = subscribeAuth(changed)
    const offEnd = onSessionEnd(ended)

    setAccessToken(fakeToken({ role: MemberRole.BUYER, expiresInSec: 60 }))
    expect(getAuthSession()?.role).toBe(MemberRole.BUYER)
    vi.advanceTimersByTime(60_000)

    expect(getAuthSession()).toBeNull()
    expect(ended).toHaveBeenCalledWith('expired')
    expect(changed).toHaveBeenCalledTimes(2)
    off()
    offEnd()
  })
})
