import { HttpResponse, http } from 'msw'
import { createApp } from '../app.ts'
import { loadConfig } from '../config.ts'
import { MemorySessionStore, type SessionStore } from '../session/store.ts'
import { server } from './server.ts'

export const BACKEND = 'http://backend.test'
export const ORIGIN = 'http://localhost:5173'
const ACCESS_MS = 30 * 60_000
const REFRESH_MS = 14 * 24 * 60 * 60_000

export const problemJson = (status: number, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

/** 서명은 BFF가 보지 않으니 payload만 맞춘다 */
export const fakeJwt = (claims: { sub: string; roles: string[]; n: number }) =>
  `${base64url({ alg: 'HS256' })}.${base64url(claims)}.signature`

/**
 * 시계를 움직일 수 있는 BFF + 1회용 refresh를 흉내 내는 가짜 인증 서버.
 * 백엔드처럼 access 30분·refresh 14일, 쓴 refresh는 다시 쓰면 401이다
 */
export function setup(
  options: { roles?: string[]; store?: (now: () => number) => SessionStore } = {},
) {
  const clock = { now: Date.parse('2026-10-27T00:00:00Z') }
  const roles = options.roles ?? ['BUYER']
  let issued = 0
  const validRefresh = new Set<string>()
  const validAccess = new Map<string, number>()
  const calls = { login: 0, reissue: 0 }

  const issue = () => {
    issued += 1
    const accessToken = fakeJwt({ sub: '7', roles, n: issued })
    const refreshToken = `refresh-${issued}`
    validAccess.set(accessToken, clock.now + ACCESS_MS)
    validRefresh.add(refreshToken)
    return {
      tokenType: 'Bearer',
      accessToken,
      accessTokenExpiresAt: new Date(clock.now + ACCESS_MS).toISOString(),
      refreshToken,
      refreshTokenExpiresAt: new Date(clock.now + REFRESH_MS).toISOString(),
    }
  }

  /** 백엔드처럼 Bearer를 확인한다. 없으면 null, 만료면 401 응답 */
  const authenticate = (request: Request): Response | 'ok' | null => {
    const header = request.headers.get('Authorization')
    if (!header) return null
    const expiresAt = validAccess.get(header.replace('Bearer ', ''))
    if (expiresAt === undefined) return problemJson(401, '유효하지 않은 토큰입니다.')
    if (expiresAt <= clock.now) return problemJson(401, '토큰이 만료되었습니다.')
    return 'ok'
  }

  server.use(
    http.post(`${BACKEND}/api/v1/auth/login`, async ({ request }) => {
      calls.login += 1
      const body = (await request.json()) as { loginId?: string; password?: string }
      if (body.password !== 'pass1234!') {
        return problemJson(401, '아이디 또는 비밀번호가 일치하지 않습니다.')
      }
      return HttpResponse.json(issue())
    }),
    http.post(`${BACKEND}/api/v1/auth/reissue`, async ({ request }) => {
      calls.reissue += 1
      const { refreshToken } = (await request.json()) as { refreshToken: string }
      if (!validRefresh.delete(refreshToken)) {
        return problemJson(401, '로그인이 만료되었습니다. 다시 로그인해 주세요.')
      }
      return HttpResponse.json(issue())
    }),
  )

  const now = () => clock.now
  const store = options.store?.(now) ?? new MemorySessionStore(now)
  const config = loadConfig({ NODE_ENV: 'test', BACKEND_URL: BACKEND, ALLOWED_ORIGINS: ORIGIN })
  const app = createApp({ config, store, now })

  /** 브라우저처럼 같은 오리진에서 보낸다 */
  const requestTo =
    (target: typeof app) =>
    (path: string, init: RequestInit & { cookie?: string | null } = {}) => {
      const { cookie, ...rest } = init
      const headers = new Headers(rest.headers)
      if (cookie) headers.set('Cookie', cookie)
      if (rest.method && rest.method !== 'GET' && !headers.has('Origin')) {
        headers.set('Origin', ORIGIN)
      }
      return target.request(`http://localhost:8787${path}`, { ...rest, headers })
    }
  const request = requestTo(app)
  /** 같은 세션 저장소를 쓰는 BFF 한 대를 더 띄운다. 프로세스 안의 재발급 중복 막기는 공유하지 않는다 */
  const anotherInstance = () => requestTo(createApp({ config, store, now }))

  const login = async () => {
    const response = await request('/bff/session/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: 'buyer01', password: 'pass1234!' }),
    })
    return { response, cookie: sessionCookie(response) }
  }

  return { app, clock, calls, request, anotherInstance, login, authenticate, ACCESS_MS }
}

/** Set-Cookie에서 Cookie 헤더로 보낼 "이름=값". 지우는 쿠키면 null */
export function sessionCookie(response: Response): string | null {
  const header = response.headers.getSetCookie().find((value) => value.includes('paldo_sid='))
  if (!header) return null
  const pair = header.split(';')[0] ?? ''
  return pair.endsWith('=') ? null : pair
}
