import { createMiddleware } from 'hono/factory'
import type { CookieTokens, TokenCookies } from './session/cookie.ts'
import type { TokenRefresher } from './session/refresher.ts'
import { type Session, type SessionView, viewOfAccessToken } from './session/session.ts'

/** 요청 하나가 백엔드에 무엇으로 인증하는지. 끝나면 쿠키를 새로 쓰거나 지운다 */
export class RequestAuth {
  readonly #refresher: TokenRefresher
  // TODO(bff-2단계): 프론트가 쿠키 세션으로 바뀌면 브라우저 Authorization 통과를 없앤다 (ADR-0006)
  #passthrough: string | null = null
  #accessToken: string | null
  readonly #refreshToken: string | null
  #cookie: { kind: 'keep' } | { kind: 'clear' } | { kind: 'write'; session: Session } = {
    kind: 'keep',
  }

  constructor(refresher: TokenRefresher, tokens: CookieTokens) {
    this.#refresher = refresher
    this.#accessToken = tokens.accessToken
    this.#refreshToken = tokens.refreshToken
  }

  get authorization(): string | null {
    if (this.#passthrough) return this.#passthrough
    return this.#accessToken ? `Bearer ${this.#accessToken}` : null
  }

  /** 쿠키의 access를 붙였는지. 브라우저가 보낸 토큰이면 BFF가 쿠키를 건드리지 않는다 */
  get usesCookie(): boolean {
    return this.#passthrough === null && this.#accessToken !== null
  }

  /** 쿠키의 access로 본 회원 정보. access가 없거나 형식이 틀리면 null */
  get view(): SessionView | null {
    return this.#accessToken ? viewOfAccessToken(this.#accessToken) : null
  }

  get cookieChange() {
    return this.#cookie
  }

  passthrough(header: string): void {
    this.#passthrough = header
  }

  /** 로그인·재발급으로 받은 새 토큰을 이 요청에 쓰고 쿠키에 쓴다 */
  replaceTokens(session: Session): void {
    this.#accessToken = session.accessToken
    this.#cookie = { kind: 'write', session }
  }

  /**
   * refresh 쿠키로 새 토큰을 받는다. 재발급되면 true. refresh가 거절되면 두 쿠키를 지운다.
   * refresh 쿠키는 /bff/session 경로에만 실린다. 그 밖의 경로에서 부르면 access 쿠키를 지우게 되니 부르지 않는다
   */
  async refresh(): Promise<boolean> {
    if (!this.#refreshToken) {
      // 쓸 수 없는 access만 남았으면 지운다
      if (this.#accessToken) this.end()
      return false
    }
    const session = await this.#refresher.refresh(this.#refreshToken)
    if (!session) {
      this.end()
      return false
    }
    this.replaceTokens(session)
    return true
  }

  end(): void {
    this.#accessToken = null
    this.#cookie = { kind: 'clear' }
  }
}

export type AppEnv = { Variables: { auth: RequestAuth } }

export function authMiddleware(deps: { refresher: TokenRefresher; cookies: TokenCookies }) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const auth = new RequestAuth(deps.refresher, deps.cookies.read(c))
    const header = c.req.header('Authorization')
    if (header) auth.passthrough(header)
    c.set('auth', auth)

    await next()

    const change = auth.cookieChange
    if (change.kind === 'write') deps.cookies.write(c, change.session)
    if (change.kind === 'clear') deps.cookies.clear(c)
  })
}
