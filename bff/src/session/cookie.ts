import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Session } from './session.ts'

// 세션 저장소 없이 백엔드 토큰을 HttpOnly 쿠키에 그대로 담는다 (ADR-0009).
// access는 모든 요청에, refresh는 재발급 경로(/bff/session)에만 싣는다. refresh가 자주 오갈수록 새기 쉽다
const REFRESH_PATH = '/bff/session'
// 백엔드가 만료로 거절하기 전에 브라우저가 먼저 access를 버리게 한다
const ACCESS_EXPIRY_SKEW_MS = 30_000

// __Host-는 Secure·Path=/·Domain 없음을, __Secure-는 Secure를 브라우저가 강제한다. http 개발 서버에서는 쓸 수 없다
const names = (secure: boolean) =>
  secure
    ? { access: '__Host-paldo_at', refresh: '__Secure-paldo_rt' }
    : { access: 'paldo_at', refresh: 'paldo_rt' }

/** 브라우저가 실어 보낸 토큰 쿠키. 경로에 따라 refresh는 없을 수 있다 */
export type CookieTokens = { accessToken: string | null; refreshToken: string | null }

export class TokenCookies {
  readonly #secure: boolean
  readonly #names: { access: string; refresh: string }
  readonly #now: () => number

  constructor(secure: boolean, now: () => number = Date.now) {
    this.#secure = secure
    this.#names = names(secure)
    this.#now = now
  }

  read(c: Context): CookieTokens {
    return {
      accessToken: getCookie(c, this.#names.access) ?? null,
      refreshToken: getCookie(c, this.#names.refresh) ?? null,
    }
  }

  /** 브라우저가 인증 정보를 저절로 실었는지 (CSRF 판단) */
  present(c: Context): boolean {
    const { accessToken, refreshToken } = this.read(c)
    return accessToken !== null || refreshToken !== null
  }

  write(c: Context, session: Session): void {
    const seconds = (until: number) => Math.max(0, Math.floor((until - this.#now()) / 1000))
    const options = { httpOnly: true, secure: this.#secure, sameSite: 'Lax' } as const
    setCookie(c, this.#names.access, session.accessToken, {
      ...options,
      path: '/',
      maxAge: seconds(session.accessTokenExpiresAt - ACCESS_EXPIRY_SKEW_MS),
    })
    setCookie(c, this.#names.refresh, session.refreshToken, {
      ...options,
      path: REFRESH_PATH,
      maxAge: seconds(session.refreshTokenExpiresAt),
    })
  }

  clear(c: Context): void {
    deleteCookie(c, this.#names.access, { path: '/', secure: this.#secure })
    deleteCookie(c, this.#names.refresh, { path: REFRESH_PATH, secure: this.#secure })
  }
}
