import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Session } from './session.ts'

// __Host- 접두어는 Secure·Path=/·Domain 없음을 브라우저가 강제한다. http 개발 서버에서는 쓸 수 없다
const cookieName = (secure: boolean) => (secure ? '__Host-paldo_sid' : 'paldo_sid')

export class SessionCookie {
  readonly #secure: boolean
  readonly #now: () => number

  constructor(secure: boolean, now: () => number = Date.now) {
    this.#secure = secure
    this.#now = now
  }

  read(c: Context): string | null {
    return getCookie(c, cookieName(this.#secure)) ?? null
  }

  /** 로그인 유지: refresh가 끝날 때까지(14일) 남기고, 재발급할 때마다 다시 늘린다 */
  write(c: Context, id: string, session: Session): void {
    const maxAge = Math.max(0, Math.floor((session.refreshTokenExpiresAt - this.#now()) / 1000))
    setCookie(c, cookieName(this.#secure), id, {
      httpOnly: true,
      secure: this.#secure,
      sameSite: 'Lax',
      path: '/',
      maxAge,
    })
  }

  clear(c: Context): void {
    deleteCookie(c, cookieName(this.#secure), { path: '/', secure: this.#secure })
  }
}
