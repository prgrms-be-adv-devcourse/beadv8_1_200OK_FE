import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { BACKEND, sessionCookie, setup } from '../test/fakeBackend.ts'
import { server } from '../test/server.ts'

describe('쿠키 세션', () => {
  it('로그인하면 토큰 없이 회원 정보만 주고 HttpOnly 세션 쿠키를 14일로 건다', async () => {
    const { login } = setup({ roles: ['BUYER', 'SELLER'] })

    const { response, cookie } = await login()

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ memberId: 7, roles: ['BUYER', 'SELLER'] })
    expect(JSON.stringify(body)).not.toContain('refresh')
    const setCookie = response.headers.getSetCookie().join('\n')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain(`Max-Age=${14 * 24 * 60 * 60}`)
    expect(cookie).toMatch(/^paldo_sid=/)
  })

  it('로그인 실패는 백엔드 문구를 그대로 돌려주고 쿠키를 걸지 않는다', async () => {
    const { request } = setup()

    const response = await request('/bff/session/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: 'buyer01', password: 'wrong' }),
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({
      detail: '아이디 또는 비밀번호가 일치하지 않습니다.',
    })
    expect(sessionCookie(response)).toBeNull()
  })

  it('세션이 없으면 GET /bff/session은 problem+json 401이다', async () => {
    const { request } = setup()

    const response = await request('/bff/session')

    expect(response.status).toBe(401)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({ status: 401, detail: '로그인이 필요해요' })
  })

  it('로그아웃하면 세션을 지워 같은 쿠키로 다시 쓸 수 없다', async () => {
    const { request, login } = setup()
    const { cookie } = await login()

    const logout = await request('/bff/session/logout', { method: 'POST', cookie })
    const after = await request('/bff/session', { cookie })

    expect(logout.status).toBe(204)
    expect(logout.headers.getSetCookie().join()).toContain('Max-Age=0')
    expect(after.status).toBe(401)
  })

  it('access가 만료됐으면 세션 조회 전에 재발급하고 쿠키 기한을 다시 14일로 늘린다', async () => {
    const { request, login, clock, calls, ACCESS_MS } = setup()
    const { cookie } = await login()
    clock.now += ACCESS_MS + 1

    const response = await request('/bff/session', { cookie })

    expect(response.status).toBe(200)
    expect(calls.reissue).toBe(1)
    expect(response.headers.getSetCookie().join()).toContain(`Max-Age=${14 * 24 * 60 * 60}`)
  })

  it('refresh까지 끝난 세션이면 401과 함께 쿠키를 지운다', async () => {
    const { request, login, clock } = setup()
    const { cookie } = await login()
    clock.now += 15 * 24 * 60 * 60_000

    const response = await request('/bff/session', { cookie })

    expect(response.status).toBe(401)
    expect(response.headers.getSetCookie().join()).toContain('Max-Age=0')
  })

  it('권한이 바뀐 뒤 /bff/session/refresh는 access가 남아 있어도 새로 받는다', async () => {
    const { request, login, calls } = setup()
    const { cookie } = await login()

    const response = await request('/bff/session/refresh', { method: 'POST', cookie })

    expect(response.status).toBe(200)
    expect(calls.reissue).toBe(1)
  })

  it('재발급 중 백엔드가 5xx면 세션을 끝내지 않고 502를 준다', async () => {
    const { request, login, clock, ACCESS_MS } = setup()
    const { cookie } = await login()
    clock.now += ACCESS_MS + 1
    server.use(
      http.post(`${BACKEND}/api/v1/auth/reissue`, () => new HttpResponse(null, { status: 503 }), {
        once: true,
      }),
    )

    const failed = await request('/bff/session', { cookie })
    const recovered = await request('/bff/session', { cookie })

    expect(failed.status).toBe(502)
    expect(failed.headers.getSetCookie()).toEqual([])
    expect(recovered.status).toBe(200)
  })
})

describe('CSRF Origin 확인', () => {
  it('허용하지 않은 Origin의 POST는 403이다', async () => {
    const { request, login, calls } = setup()
    const { cookie } = await login()

    const response = await request('/bff/session/logout', {
      method: 'POST',
      cookie,
      headers: { Origin: 'https://evil.example' },
    })

    expect(response.status).toBe(403)
    expect(calls.login).toBe(1)
  })

  it('Origin 없이 쿠키를 실은 POST는 403이다', async () => {
    const { app, login } = setup()
    const { cookie } = await login()

    const response = await app.request('http://localhost:8787/bff/session/logout', {
      method: 'POST',
      headers: { Cookie: cookie ?? '' },
    })

    expect(response.status).toBe(403)
  })
})
