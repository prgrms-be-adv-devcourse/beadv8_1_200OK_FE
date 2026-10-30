import { HttpResponse, http } from 'msw'
import { createApp } from '../app.ts'
import { loadConfig } from '../config.ts'
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
export function setup(options: { roles?: string[]; cookieSecure?: boolean } = {}) {
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

  const config = loadConfig({
    NODE_ENV: 'test',
    BACKEND_URL: BACKEND,
    ALLOWED_ORIGINS: ORIGIN,
    COOKIE_SECURE: String(options.cookieSecure ?? false),
  })
  const app = createApp({ config, now: () => clock.now })

  /** 브라우저처럼 같은 오리진에서 보낸다. jar를 주면 경로·만료가 맞는 쿠키를 싣고 받은 Set-Cookie를 담는다 */
  const request = async (
    path: string,
    init: RequestInit & { jar?: CookieJar; cookie?: string } = {},
  ) => {
    const { jar, cookie, ...rest } = init
    const headers = new Headers(rest.headers)
    const sent = cookie ?? jar?.header(path)
    if (sent) headers.set('Cookie', sent)
    if (rest.method && rest.method !== 'GET' && !headers.has('Origin')) {
      headers.set('Origin', ORIGIN)
    }
    const response = await app.request(`http://localhost:8787${path}`, { ...rest, headers })
    jar?.store(response)
    return response
  }

  /** 로그인한 브라우저 하나. 탭은 같은 jar를 나눠 쓴다 */
  const login = async () => {
    const jar = new CookieJar(() => clock.now)
    const response = await request('/bff/session/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: 'buyer01', password: 'pass1234!' }),
      jar,
    })
    return { response, jar }
  }

  return { app, clock, calls, request, login, authenticate, ACCESS_MS, REFRESH_MS }
}

/** 브라우저 쿠키 저장소. Path가 요청 경로의 접두어이고 Max-Age가 남은 쿠키만 보낸다 */
export class CookieJar {
  readonly #cookies = new Map<string, { value: string; path: string; expiresAt: number }>()
  readonly #now: () => number

  constructor(now: () => number) {
    this.#now = now
  }

  store(response: Response): void {
    for (const header of response.headers.getSetCookie()) {
      const [pair = '', ...attributes] = header.split(';').map((part) => part.trim())
      const [name = '', value = ''] = pair.split('=')
      const attribute = (key: string) =>
        attributes.find((item) => item.toLowerCase().startsWith(`${key}=`))?.split('=')[1]
      const maxAge = Number(attribute('max-age') ?? Number.POSITIVE_INFINITY)
      if (maxAge <= 0) this.#cookies.delete(name)
      else {
        this.#cookies.set(name, {
          value,
          path: attribute('path') ?? '/',
          expiresAt: this.#now() + maxAge * 1000,
        })
      }
    }
  }

  header(path: string): string | undefined {
    const sent = [...this.#cookies]
      .filter(([, cookie]) => cookie.expiresAt > this.#now() && pathMatches(path, cookie.path))
      .map(([name, cookie]) => `${name}=${cookie.value}`)
    return sent.length ? sent.join('; ') : undefined
  }

  names(): string[] {
    return [...this.#cookies.keys()]
  }
}

const pathMatches = (requestPath: string, cookiePath: string) =>
  requestPath === cookiePath ||
  requestPath.startsWith(cookiePath.endsWith('/') ? cookiePath : `${cookiePath}/`) ||
  requestPath.startsWith(`${cookiePath}?`)
