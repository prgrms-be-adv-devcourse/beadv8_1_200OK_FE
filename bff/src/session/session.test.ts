import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { BACKEND, problemJson, setup } from '../test/fakeBackend.ts'
import { server } from '../test/server.ts'

const cookieFor = (response: Response, name: string) =>
  response.headers
    .getSetCookie()
    .find((header) => header.startsWith(`${name}=`))
    ?.split(';')
    .map((part) => part.trim())

describe('토큰 쿠키 세션', () => {
  it('로그인하면 회원 정보만 주고 access·refresh를 HttpOnly 쿠키 두 개에 나눠 건다', async () => {
    const { login } = setup({ roles: ['BUYER', 'SELLER'] })

    const { response } = await login()

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ memberId: 7, roles: ['BUYER', 'SELLER'] })
    expect(JSON.stringify(body)).not.toContain('refresh')
    // access: 모든 요청에 싣고, 백엔드가 거절하기 전(30초 앞)에 브라우저가 버린다
    expect(cookieFor(response, 'paldo_at')).toEqual(
      expect.arrayContaining(['HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${30 * 60 - 30}`]),
    )
    // refresh: 재발급 경로에만 싣는다
    expect(cookieFor(response, 'paldo_rt')).toEqual(
      expect.arrayContaining([
        'HttpOnly',
        'SameSite=Lax',
        'Path=/bff/session',
        `Max-Age=${14 * 24 * 60 * 60}`,
      ]),
    )
  })

  it('운영(Secure)에서는 __Host-·__Secure- 접두어 쿠키로 걸고, 로그아웃도 같은 이름·경로로 지운다', async () => {
    const { request, login } = setup({ cookieSecure: true })

    const { response, jar } = await login()
    const logout = await request('/bff/session/logout', { method: 'POST', jar })

    expect(cookieFor(response, '__Host-paldo_at')).toEqual(
      expect.arrayContaining(['HttpOnly', 'Secure', 'Path=/']),
    )
    expect(cookieFor(response, '__Secure-paldo_rt')).toEqual(
      expect.arrayContaining(['HttpOnly', 'Secure', 'Path=/bff/session']),
    )
    expect(cookieFor(logout, '__Host-paldo_at')).toEqual(
      expect.arrayContaining(['Max-Age=0', 'Secure', 'Path=/']),
    )
    expect(cookieFor(logout, '__Secure-paldo_rt')).toEqual(
      expect.arrayContaining(['Max-Age=0', 'Secure', 'Path=/bff/session']),
    )
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
    expect(response.headers.getSetCookie()).toEqual([])
  })

  it('쿠키가 없으면 GET /bff/session은 problem+json 401이다', async () => {
    const { request } = setup()

    const response = await request('/bff/session')

    expect(response.status).toBe(401)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({ status: 401, detail: '로그인이 필요해요' })
    expect(response.headers.getSetCookie()).toEqual([])
  })

  it('access가 만료되면 /api는 재발급하지 않고 401을 주고, /bff/session/refresh 뒤 다시 보내면 된다', async () => {
    const { request, login, authenticate, clock, calls, ACCESS_MS } = setup()
    const { jar } = await login()
    server.use(
      http.get(`${BACKEND}/api/v1/orders`, ({ request }) => {
        const result = authenticate(request)
        if (result === 'ok') return HttpResponse.json([])
        return result ?? problemJson(401, '로그인이 필요합니다.')
      }),
    )
    clock.now += ACCESS_MS

    const expired = await request('/api/v1/orders', { jar })
    const refreshed = await request('/bff/session/refresh', { method: 'POST', jar })
    const retried = await request('/api/v1/orders', { jar })

    expect(expired.status).toBe(401)
    expect(refreshed.status).toBe(200)
    expect(await refreshed.json()).toEqual({ memberId: 7, roles: ['BUYER'] })
    expect(retried.status).toBe(200)
    expect(calls.reissue).toBe(1)
  })

  it('GET /bff/session은 access가 만료됐으면 refresh 쿠키로 재발급하고 쿠키를 새로 건다', async () => {
    const { request, login, clock, calls, ACCESS_MS } = setup()
    const { jar } = await login()
    clock.now += ACCESS_MS

    const response = await request('/bff/session', { jar })

    expect(response.status).toBe(200)
    expect(calls.reissue).toBe(1)
    expect(response.headers.getSetCookie().join()).toContain(`Max-Age=${14 * 24 * 60 * 60}`)
  })

  it('백엔드가 refresh를 거절하면 401과 함께 두 쿠키를 지운다', async () => {
    const { request, login } = setup()
    const { jar } = await login()
    server.use(
      http.post(`${BACKEND}/api/v1/auth/reissue`, () =>
        problemJson(401, '로그인이 만료되었습니다. 다시 로그인해 주세요.'),
      ),
    )

    const response = await request('/bff/session/refresh', { method: 'POST', jar })

    expect(response.status).toBe(401)
    expect(response.headers.getSetCookie().filter((c) => c.includes('Max-Age=0'))).toHaveLength(2)
    expect(jar.names()).toEqual([])
  })

  it('refresh까지 만료됐으면 브라우저가 쿠키를 보내지 않아 401이다', async () => {
    const { request, login, clock, calls, REFRESH_MS } = setup()
    const { jar } = await login()
    clock.now += REFRESH_MS

    const response = await request('/bff/session/refresh', { method: 'POST', jar })

    expect(response.status).toBe(401)
    expect(calls.reissue).toBe(0)
  })

  it('권한이 바뀐 뒤 /bff/session/refresh는 access가 남아 있어도 새로 받는다', async () => {
    const { request, login, calls } = setup()
    const { jar } = await login()

    const response = await request('/bff/session/refresh', { method: 'POST', jar })

    expect(response.status).toBe(200)
    expect(calls.reissue).toBe(1)
  })

  it('재발급 중 백엔드가 5xx면 쿠키를 지우지 않고 502를 준다', async () => {
    const { request, login } = setup()
    const { jar } = await login()
    server.use(
      http.post(`${BACKEND}/api/v1/auth/reissue`, () => new HttpResponse(null, { status: 503 }), {
        once: true,
      }),
    )

    const failed = await request('/bff/session/refresh', { method: 'POST', jar })
    const recovered = await request('/bff/session/refresh', { method: 'POST', jar })

    expect(failed.status).toBe(502)
    expect(failed.headers.getSetCookie()).toEqual([])
    expect(recovered.status).toBe(200)
  })

  it('재발급이 429(요청 과다)로 막히면 로그아웃시키지 않고 쿠키를 둔 채 502를 준다', async () => {
    const { request, login } = setup()
    const { jar } = await login()
    server.use(
      http.post(`${BACKEND}/api/v1/auth/reissue`, () => new HttpResponse(null, { status: 429 }), {
        once: true,
      }),
    )

    const response = await request('/bff/session/refresh', { method: 'POST', jar })

    expect(response.status).toBe(502)
    expect(jar.names()).toHaveLength(2)
  })

  it('여러 탭이 같은 refresh로 동시에 재발급해도 백엔드 재발급은 한 번이고 모두 새 토큰을 받는다', async () => {
    const { request, login, calls } = setup()
    const { jar } = await login()

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => request('/bff/session/refresh', { method: 'POST', jar })),
    )

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200])
    expect(calls.reissue).toBe(1)
  })

  it('쿠키가 바뀌기 전에 보낸 같은 refresh는 10초 안이면 같은 새 토큰을 받고, 지나면 401이다', async () => {
    const { request, login, clock, calls } = setup()
    const { jar } = await login()
    const stale = jar.header('/bff/session/refresh')

    await request('/bff/session/refresh', { method: 'POST', jar })
    const late = await request('/bff/session/refresh', { method: 'POST', cookie: stale })
    clock.now += 10_000
    const tooLate = await request('/bff/session/refresh', { method: 'POST', cookie: stale })

    expect(late.status).toBe(200)
    expect(tooLate.status).toBe(401)
    expect(calls.reissue).toBe(2)
  })

  it('로그아웃하면 두 쿠키를 지운다', async () => {
    const { request, login } = setup()
    const { jar } = await login()

    const logout = await request('/bff/session/logout', { method: 'POST', jar })
    const after = await request('/bff/session', { jar })

    expect(logout.status).toBe(204)
    expect(jar.names()).toEqual([])
    expect(after.status).toBe(401)
  })
})

describe('CSRF Origin 확인', () => {
  it('허용하지 않은 Origin의 POST는 쿠키가 있으면 403이다', async () => {
    const { request, login } = setup()
    const { jar } = await login()

    const response = await request('/bff/session/logout', {
      method: 'POST',
      jar,
      headers: { Origin: 'https://evil.example' },
    })

    expect(response.status).toBe(403)
    expect(jar.names()).toHaveLength(2)
  })

  it('Origin 없이 쿠키를 실은 POST는 403이다', async () => {
    const { app, login } = setup()
    const { jar } = await login()

    const response = await app.request('http://localhost:8787/bff/session/logout', {
      method: 'POST',
      headers: { Cookie: jar.header('/bff/session/logout') ?? '' },
    })

    expect(response.status).toBe(403)
  })

  it('쿠키 없는 /api 요청은 다른 Origin이어도 통과한다 — 1단계 Bearer는 다른 사이트가 대신 보낼 수 없다', async () => {
    const { request } = setup()
    server.use(
      http.post(`${BACKEND}/api/v1/cart/items`, () => HttpResponse.json({}, { status: 201 })),
    )

    const response = await request('/api/v1/cart/items', {
      method: 'POST',
      headers: {
        Origin: 'https://paldo-gotgan-fe-git-feature.vercel.app',
        Authorization: 'Bearer t',
      },
    })

    expect(response.status).toBe(201)
  })

  it('쿠키를 실은 /api 요청은 다른 Origin이면 403이다', async () => {
    const { request, login } = setup()
    const { jar } = await login()
    let reached = false
    server.use(
      http.post(`${BACKEND}/api/v1/cart/items`, () => {
        reached = true
        return HttpResponse.json({}, { status: 201 })
      }),
    )

    const response = await request('/api/v1/cart/items', {
      method: 'POST',
      jar,
      headers: { Origin: 'https://evil.example' },
    })

    expect(response.status).toBe(403)
    expect(reached).toBe(false)
  })

  it('/bff 요청은 쿠키가 없어도 다른 Origin이면 403이다 — 로그인 CSRF를 막는다', async () => {
    const { request, calls } = setup()

    const response = await request('/bff/session/login', {
      method: 'POST',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: 'buyer01', password: 'pass1234!' }),
    })

    expect(response.status).toBe(403)
    expect(calls.login).toBe(0)
  })
})
