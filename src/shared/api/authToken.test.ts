import { fakeToken } from '@/test/token'
import {
  clearAccessToken,
  getAuthSession,
  getFreshAuthSession,
  getRefreshToken,
  onSessionEnd,
  readTokenClaims,
  restoreAccessToken,
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

  it('roles 배열에서 가장 높은 역할을 고르고, 이전 형식 role 문자열도 읽는다', () => {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '')
    const exp = Math.floor(Date.now() / 1000) + 60
    const token = (payload: object) => `${encode({ alg: 'HS256' })}.${encode(payload)}.sig`

    expect(readTokenClaims(token({ sub: '4', roles: ['BUYER', 'SELLER'], exp }))?.role).toBe(
      MemberRole.SELLER,
    )
    expect(readTokenClaims(token({ sub: '4', role: 'ADMIN', exp }))?.role).toBe(MemberRole.ADMIN)
    expect(readTokenClaims(token({ sub: '4', roles: [], exp }))).toBeNull()
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

  it('refreshToken이 있으면 만료 시각이 돼도 세션을 끝내지 않는다 (요청 때 재발급)', () => {
    vi.useFakeTimers()
    const ended = vi.fn()
    const offEnd = onSessionEnd(ended)
    setAccessToken(fakeToken({ role: MemberRole.BUYER, expiresInSec: 60 }), 'refresh-1')
    vi.advanceTimersByTime(120_000)

    expect(getAuthSession()?.role).toBe(MemberRole.BUYER)
    expect(getFreshAuthSession()).not.toBeNull()
    expect(ended).not.toHaveBeenCalled()
    offEnd()
  })

  it('refresh를 생략하면 갖고 있던 refreshToken을 그대로 둔다', () => {
    setAccessToken(fakeToken({ role: MemberRole.BUYER }), 'refresh-1')
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    expect(getRefreshToken()).toBe('refresh-1')
    setAccessToken(fakeToken({ role: MemberRole.BUYER }), null)
    expect(getRefreshToken()).toBeNull()
  })
})

describe('authToken 저장', () => {
  afterEach(() => {
    clearAccessToken()
    sessionStorage.clear()
  })

  it('로그인하면 sessionStorage에 두고, 로그아웃하면 지운다', () => {
    const token = fakeToken({ role: MemberRole.BUYER })
    setAccessToken(token, 'refresh-1')
    expect(sessionStorage.getItem('paldo.auth.accessToken')).toBe(token)
    expect(sessionStorage.getItem('paldo.auth.refreshToken')).toBe('refresh-1')

    clearAccessToken()
    expect(sessionStorage.getItem('paldo.auth.accessToken')).toBeNull()
    expect(sessionStorage.getItem('paldo.auth.refreshToken')).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('앱을 다시 열 때 access가 만료됐어도 refreshToken이 있으면 세션을 살린다', () => {
    sessionStorage.setItem(
      'paldo.auth.accessToken',
      fakeToken({ memberId: 3, role: MemberRole.BUYER, expiresInSec: -10 }),
    )
    sessionStorage.setItem('paldo.auth.refreshToken', 'refresh-1')
    expect(restoreAccessToken()).toMatchObject({ memberId: 3 })
    expect(getRefreshToken()).toBe('refresh-1')
  })

  it('앱을 다시 열면 저장한 토큰으로 세션을 되살린다', () => {
    const token = fakeToken({ memberId: 9, role: MemberRole.SELLER })
    sessionStorage.setItem('paldo.auth.accessToken', token)

    expect(restoreAccessToken()).toMatchObject({ memberId: 9, role: MemberRole.SELLER })
    expect(getAuthSession()?.accessToken).toBe(token)
  })

  it('저장한 토큰이 만료됐거나 깨졌으면 되살리지 않고 지운다', () => {
    sessionStorage.setItem(
      'paldo.auth.accessToken',
      fakeToken({ role: MemberRole.BUYER, expiresInSec: -10 }),
    )
    expect(restoreAccessToken()).toBeNull()
    expect(sessionStorage.getItem('paldo.auth.accessToken')).toBeNull()

    sessionStorage.setItem('paldo.auth.accessToken', 'broken')
    expect(restoreAccessToken()).toBeNull()
    expect(getAuthSession()).toBeNull()
  })
})
