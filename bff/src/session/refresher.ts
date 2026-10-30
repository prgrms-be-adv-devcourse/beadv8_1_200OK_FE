import { type Upstream, UpstreamError } from '../upstream.ts'
import { type Session, sessionFromTokens, type TokenResponse } from './session.ts'

// 조금 늦게 도착한 같은 refresh(다른 탭이 쿠키가 바뀌기 전에 보낸 요청)에도 같은 새 토큰을 준다
const RECENT_MS = 10_000
// 백엔드가 refresh를 받지 않겠다는 응답(검증 실패·만료·재사용)
const REJECTED = new Set([400, 401, 403])

/**
 * refresh는 1회용이라 같은 refresh로 두 번 재발급하면 둘째가 401로 로그아웃된다.
 * 진행 중인 재발급은 같이 기다리고, 끝난 결과는 잠깐 기억한다.
 * BFF가 한 대라 프로세스 메모리로 충분하다. 여러 대가 되면 다시 정한다 (ADR-0009)
 */
export class TokenRefresher {
  readonly #upstream: Upstream
  readonly #timeoutMs: number
  readonly #now: () => number
  readonly #inflight = new Map<string, Promise<Session | null>>()
  readonly #recent = new Map<string, { session: Session; until: number }>()

  constructor(options: { upstream: Upstream; timeoutMs: number; now?: () => number }) {
    this.#upstream = options.upstream
    this.#timeoutMs = options.timeoutMs
    this.#now = options.now ?? Date.now
  }

  /** 새 토큰. refresh가 거절됐으면 null. 그 밖의 실패(5xx·429 등)는 UpstreamError */
  refresh(refreshToken: string): Promise<Session | null> {
    this.#forgetExpired()
    const recent = this.#recent.get(refreshToken)
    if (recent) return Promise.resolve(recent.session)
    const running = this.#inflight.get(refreshToken)
    if (running) return running
    const task = this.#reissue(refreshToken).finally(() => this.#inflight.delete(refreshToken))
    this.#inflight.set(refreshToken, task)
    return task
  }

  async #reissue(refreshToken: string): Promise<Session | null> {
    const response = await this.#upstream.fetch('member', '/api/v1/auth/reissue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
      timeoutMs: this.#timeoutMs,
    })
    if (response.ok) {
      const session = sessionFromTokens((await response.json()) as TokenResponse)
      this.#recent.set(refreshToken, { session, until: this.#now() + RECENT_MS })
      return session
    }
    // refresh가 만료·재사용·위조됐다고 백엔드가 답한 것만 로그아웃이다.
    // 5xx·429처럼 잠깐의 문제로는 쿠키를 지우지 않는다
    if (!REJECTED.has(response.status)) throw new UpstreamError('unreachable', response.status)
    await response.body?.cancel()
    return null
  }

  #forgetExpired(): void {
    const now = this.#now()
    for (const [token, entry] of this.#recent) {
      if (entry.until <= now) this.#recent.delete(token)
    }
  }
}
