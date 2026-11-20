import { delay, HttpResponse, http } from 'msw'
import { server } from '@/mocks/server'
import { fakeToken } from '@/test/token'
import {
  clearAccessToken,
  getAuthSession,
  getRefreshToken,
  onSessionEnd,
  setAccessToken,
} from './authToken'
import { logoutSession, reissueSession } from './reissue'
import { MemberRole } from './types'

const tokens = (refreshToken: string) => ({
  tokenType: 'Bearer',
  accessToken: fakeToken({ role: MemberRole.BUYER, memberId: 2 }),
  accessTokenExpiresAt: '',
  refreshToken,
  refreshTokenExpiresAt: '',
})

/** 로그아웃 요청 본문의 refreshToken을 모은다 */
function recordLogout(
  response: () => Response | Promise<Response> = () => new HttpResponse(null, { status: 204 }),
) {
  const revoked: string[] = []
  server.use(
    http.post('*/api/v1/auth/logout', async ({ request }) => {
      revoked.push(((await request.json()) as { refreshToken: string }).refreshToken)
      return response()
    }),
  )
  return revoked
}

afterEach(() => clearAccessToken())

describe('logoutSession', () => {
  it('토큰을 바로 지우고, 갖고 있던 refreshToken을 본문에 담아 서버 세션을 폐기한다', async () => {
    const revoked = recordLogout()
    const reasons: string[] = []
    const off = onSessionEnd((reason) => reasons.push(reason))
    setAccessToken(fakeToken({ role: MemberRole.BUYER }), 'refresh-1')

    const done = logoutSession()
    // 응답을 기다리지 않고 바로 로그아웃된다
    expect(getAuthSession()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(reasons).toEqual(['logout'])
    await done

    expect(revoked).toEqual(['refresh-1'])
    off()
  })

  it.each([
    ['서버 오류(500)', () => HttpResponse.json({ status: 500, detail: '오류' }, { status: 500 })],
    ['연결 실패', () => HttpResponse.error()],
  ])('폐기가 %s여도 오류 없이 로그아웃을 끝낸다', async (_, response) => {
    const revoked = recordLogout(response)
    setAccessToken(fakeToken({ role: MemberRole.BUYER }), 'refresh-1')

    await expect(logoutSession()).resolves.toBeUndefined()

    expect(revoked).toEqual(['refresh-1'])
    expect(getAuthSession()).toBeNull()
  })

  it('로그인하지 않았으면 서버를 부르지 않는다', async () => {
    const revoked = recordLogout()

    await logoutSession()

    expect(revoked).toEqual([])
  })

  it('재발급 중에 로그아웃하면 재발급 응답의 새 refreshToken으로 폐기하고 세션을 되살리지 않는다', async () => {
    const revoked = recordLogout()
    server.use(
      http.post('*/api/v1/auth/reissue', async () => {
        await delay(20)
        return HttpResponse.json(tokens('refresh-new'))
      }),
    )
    setAccessToken(fakeToken({ role: MemberRole.BUYER }), 'refresh-old')

    const reissuing = reissueSession().catch((error: unknown) => error)
    await logoutSession()

    // 옛 토큰은 서버가 이미 바꿔서 세션을 찾지 못한다
    expect(revoked).toEqual(['refresh-new'])
    expect(await reissuing).toMatchObject({ status: 401 })
    expect(getAuthSession()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('재발급 중에 로그아웃했는데 재발급이 실패하면 갖고 있던 refreshToken으로 폐기한다', async () => {
    const revoked = recordLogout()
    server.use(
      http.post('*/api/v1/auth/reissue', async () => {
        await delay(20)
        return HttpResponse.json({ status: 401, detail: '만료' }, { status: 401 })
      }),
    )
    setAccessToken(fakeToken({ role: MemberRole.BUYER }), 'refresh-old')

    const reissuing = reissueSession().catch(() => null)
    await logoutSession()
    await reissuing

    expect(revoked).toEqual(['refresh-old'])
    expect(getAuthSession()).toBeNull()
  })
})

describe('reissueSession', () => {
  it('재발급을 기다리는 사이 다시 로그인했으면 실패해도 새 세션을 끝내지 않는다', async () => {
    recordLogout()
    server.use(
      http.post('*/api/v1/auth/reissue', async () => {
        await delay(20)
        return HttpResponse.json({ status: 401, detail: '만료' }, { status: 401 })
      }),
    )
    setAccessToken(fakeToken({ role: MemberRole.BUYER }), 'refresh-old')

    const reissuing = reissueSession().catch((error: unknown) => error)
    const loggedOut = logoutSession()
    const relogin = fakeToken({ role: MemberRole.SELLER, memberId: 3 })
    setAccessToken(relogin, 'refresh-relogin')
    expect(await reissuing).toMatchObject({ status: 401 })
    await loggedOut

    expect(getAuthSession()?.accessToken).toBe(relogin)
    expect(getRefreshToken()).toBe('refresh-relogin')
  })
})
