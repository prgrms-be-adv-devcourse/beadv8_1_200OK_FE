import { createMiddleware } from 'hono/factory'
import type { SessionCookie } from './session/cookie.ts'
import type { SessionManager } from './session/manager.ts'
import type { Session } from './session/session.ts'

/** 요청 하나가 백엔드에 무엇으로 인증하는지. 끝나면 쿠키를 새로 쓰거나 지운다 */
export class RequestAuth {
  readonly #sessions: SessionManager
  // TODO(bff-2단계): 프론트가 쿠키 세션으로 바뀌면 브라우저 Authorization 통과를 없앤다 (ADR-0006)
  #passthrough: string | null = null
  #sessionId: string | null = null
  #session: Session | null = null
  #cookie: 'keep' | 'write' | 'clear' = 'keep'

  constructor(sessions: SessionManager) {
    this.#sessions = sessions
  }

  get authorization(): string | null {
    if (this.#passthrough) return this.#passthrough
    return this.#session ? `Bearer ${this.#session.accessToken}` : null
  }

  /** 세션 토큰을 붙였는지. 브라우저가 보낸 토큰이면 BFF가 재발급하지 않는다 */
  get usesSession(): boolean {
    return this.#passthrough === null && this.#session !== null
  }

  get session(): Session | null {
    return this.#session
  }

  get cookieChange(): { kind: 'keep' | 'clear' } | { kind: 'write'; id: string; session: Session } {
    if (this.#cookie === 'write' && this.#sessionId && this.#session) {
      return { kind: 'write', id: this.#sessionId, session: this.#session }
    }
    return { kind: this.#cookie === 'write' ? 'keep' : this.#cookie }
  }

  passthrough(header: string): void {
    this.#passthrough = header
  }

  use(id: string, session: Session, rotated: boolean): void {
    this.#passthrough = null
    this.#sessionId = id
    this.#session = session
    if (rotated) this.#cookie = 'write'
  }

  /** 쿠키는 있는데 세션이 끝났다 */
  expired(): void {
    this.#cookie = 'clear'
  }

  /**
   * 재발급되면 true. staleOnly는 백엔드가 "토큰이 만료되었습니다."로 거절했을 때 쓴다:
   * 다른 요청이 이미 바꿨으면 그 토큰을 쓴다. 판매자 승인처럼 권한이 바뀐 뒤에는 staleOnly 없이 부른다
   */
  async refresh(options: { staleOnly: boolean }): Promise<boolean> {
    if (!this.#sessionId || !this.#session) return false
    const next = await this.#sessions.refresh(
      this.#sessionId,
      options.staleOnly ? this.#session.accessToken : undefined,
    )
    if (!next) {
      this.#session = null
      this.#cookie = 'clear'
      return false
    }
    this.#session = next
    this.#cookie = 'write'
    return true
  }

  async end(): Promise<void> {
    if (this.#sessionId) await this.#sessions.destroy(this.#sessionId)
    this.#session = null
    this.#cookie = 'clear'
  }
}

export type AppEnv = { Variables: { auth: RequestAuth } }

export function authMiddleware(deps: { sessions: SessionManager; cookie: SessionCookie }) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const auth = new RequestAuth(deps.sessions)
    const header = c.req.header('Authorization')
    const sessionId = deps.cookie.read(c)
    if (header) {
      auth.passthrough(header)
    } else if (sessionId) {
      const found = await deps.sessions.get(sessionId)
      if (found) auth.use(sessionId, found.session, found.rotated)
      else auth.expired()
    }
    c.set('auth', auth)

    await next()

    const change = auth.cookieChange
    if (change.kind === 'write') deps.cookie.write(c, change.id, change.session)
    if (change.kind === 'clear') deps.cookie.clear(c)
  })
}
