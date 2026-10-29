import { randomBytes } from 'node:crypto'
import { type Upstream, UpstreamError } from '../upstream.ts'
import { type Session, sessionFromTokens, type TokenResponse } from './session.ts'
import { type SessionStore, SessionStoreUnavailable } from './store.ts'

// access 만료 직전에 보낸 요청이 백엔드에 닿을 때쯤 만료되지 않도록 미리 재발급한다
const EXPIRY_SKEW_MS = 30_000
// 다른 인스턴스가 재발급하는 동안 세션이 바뀌었는지 다시 보는 간격
const LOCK_POLL_MS = 100
// 재발급 락은 백엔드 timeout에 저장소 읽기·쓰기(각 2초, redis.ts)를 더한 시간보다 길게 쥔다
const LOCK_TTL_MARGIN_MS = 5_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export type Lookup = { session: Session; rotated: boolean } | null

export class SessionManager {
  readonly #store: SessionStore
  readonly #upstream: Upstream
  readonly #timeoutMs: number
  readonly #now: () => number
  /** 재발급 락이 저절로 풀리는 시간. 재발급 요청이 timeout까지 걸려도 그 전에 풀리지 않게 한다 */
  readonly #lockTtlMs: number
  // refresh는 1회용이라 동시 요청이 각자 재발급하면 둘째부터 401로 로그아웃된다.
  // 프로세스 안에서는 진행 중인 재발급을 같이 기다리고, 인스턴스 사이는 저장소의 재발급 락으로 막는다 (ADR-0007)
  readonly #inflight = new Map<string, Promise<Session | null>>()

  constructor(options: {
    store: SessionStore
    upstream: Upstream
    timeoutMs: number
    now?: () => number
  }) {
    this.#store = options.store
    this.#upstream = options.upstream
    this.#timeoutMs = options.timeoutMs
    this.#now = options.now ?? Date.now
    this.#lockTtlMs = options.timeoutMs + LOCK_TTL_MARGIN_MS
  }

  async create(tokens: TokenResponse): Promise<{ id: string; session: Session }> {
    const id = randomBytes(32).toString('base64url')
    const session = sessionFromTokens(tokens)
    await this.#store.set(id, session, session.refreshTokenExpiresAt)
    return { id, session }
  }

  /** 쓸 수 있는 세션. access가 곧 만료되면 먼저 재발급한다. 끝난 세션이면 null */
  async get(id: string): Promise<Lookup> {
    const session = await this.#store.get(id)
    if (!session) return null
    if (session.accessTokenExpiresAt - EXPIRY_SKEW_MS > this.#now()) {
      return { session, rotated: false }
    }
    return this.#rotated(await this.refresh(id, session.accessToken))
  }

  /**
   * 재발급. staleAccessToken을 주면 그 토큰이 아직 세션에 있을 때만 재발급한다.
   * 다른 요청이 이미 바꿨으면 바뀐 세션을 그대로 쓴다
   */
  refresh(id: string, staleAccessToken?: string): Promise<Session | null> {
    const running = this.#inflight.get(id)
    if (running) return running
    const task = this.#reissue(id, staleAccessToken).finally(() => this.#inflight.delete(id))
    this.#inflight.set(id, task)
    return task
  }

  async destroy(id: string): Promise<void> {
    await this.#store.delete(id)
  }

  #rotated(session: Session | null): Lookup {
    return session ? { session, rotated: true } : null
  }

  /**
   * 락을 잡은 곳만 재발급한다. 기다리는 쪽은 바뀐 세션을 쓰고, 락이 풀리면 직접 잡아 본다.
   * staleAccessToken 없이 부르면(권한이 바뀐 뒤) 다른 곳이 막 재발급했어도 한 번 더 받는다.
   * 그 재발급이 권한 변경 전에 시작됐을 수 있어서다. refresh는 락 안에서 다시 읽으니 로그아웃되지 않는다
   */
  async #reissue(id: string, staleAccessToken: string | undefined): Promise<Session | null> {
    // 주입된 now는 테스트에서 멈춰 있을 수 있다. 실제로 기다린 시간은 단조 시계로 잰다
    const deadline = performance.now() + this.#lockTtlMs
    for (;;) {
      const release = await this.#store.lockReissue(id, this.#lockTtlMs)
      if (release) {
        try {
          return await this.#reissueLocked(id, staleAccessToken)
        } finally {
          // 풀지 못해도 TTL이 지나면 풀린다. 재발급 결과를 이 오류로 덮지 않는다
          await release().catch((error: unknown) => console.error('재발급 락 해제 실패', error))
        }
      }
      if (staleAccessToken) {
        const current = await this.#store.get(id)
        if (!current) return null
        if (current.accessToken !== staleAccessToken) return current
      }
      if (performance.now() >= deadline) {
        throw new SessionStoreUnavailable(new Error('reissue lock wait timed out'))
      }
      await sleep(LOCK_POLL_MS)
    }
  }

  async #reissueLocked(id: string, staleAccessToken: string | undefined): Promise<Session | null> {
    const current = await this.#store.get(id)
    if (!current) return null
    if (staleAccessToken && current.accessToken !== staleAccessToken) return current

    const response = await this.#upstream.fetch('member', '/api/v1/auth/reissue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
      timeoutMs: this.#timeoutMs,
    })
    if (response.ok) {
      const next = sessionFromTokens((await response.json()) as TokenResponse)
      await this.#store.set(id, next, next.refreshTokenExpiresAt)
      return next
    }
    // 백엔드가 잠깐 아픈 것(5xx)으로 세션을 끝내지 않는다. 4xx는 refresh가 만료·재사용된 것이라 끝낸다
    if (response.status >= 500) throw new UpstreamError('unreachable', response.status)
    await this.#store.delete(id)
    return null
  }
}
