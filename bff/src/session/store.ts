import type { Session } from './session.ts'

/** 재발급 락을 푼다. 이미 만료돼 남이 잡았으면 아무것도 하지 않는다 */
export type ReleaseLock = () => Promise<void>

// 운영은 Redis(redis.ts, 백엔드 데이터용 Redis에 암호화해서), 개발·테스트는 메모리 (ADR-0006, ADR-0007).
// 구현은 만료가 지난 세션을 돌려주지 않아야 한다
export interface SessionStore {
  get(id: string): Promise<Session | null>
  set(id: string, session: Session, expiresAt: number): Promise<void>
  delete(id: string): Promise<void>
  /**
   * 세션 하나의 재발급을 BFF 인스턴스 전체에서 한 곳만 하게 한다. 잡으면 푸는 함수, 남이 쥐고 있으면 null.
   * 쥔 쪽이 죽어도 ttlMs가 지나면 풀린다
   */
  lockReissue(id: string, ttlMs: number): Promise<ReleaseLock | null>
}

/** 저장소에 닿지 못했다. "세션 없음"으로 다루면 잠깐 끊긴 것만으로 로그아웃되니 503으로 돌려준다 */
export class SessionStoreUnavailable extends Error {
  constructor(cause: unknown) {
    super('session store unavailable', { cause })
    this.name = 'SessionStoreUnavailable'
  }
}

// BFF 프로세스가 재시작하면 메모리 세션은 모두 사라진다. 한 프로세스 안에서만 공유된다
export class MemorySessionStore implements SessionStore {
  readonly #entries = new Map<string, { session: Session; expiresAt: number }>()
  readonly #locks = new Map<string, { owner: symbol; expiresAt: number }>()
  readonly #now: () => number

  constructor(now: () => number = Date.now) {
    this.#now = now
  }

  async get(id: string): Promise<Session | null> {
    const entry = this.#entries.get(id)
    if (!entry) return null
    if (entry.expiresAt <= this.#now()) {
      this.#entries.delete(id)
      return null
    }
    return entry.session
  }

  async set(id: string, session: Session, expiresAt: number): Promise<void> {
    this.#entries.set(id, { session, expiresAt })
  }

  async delete(id: string): Promise<void> {
    this.#entries.delete(id)
  }

  async lockReissue(id: string, ttlMs: number): Promise<ReleaseLock | null> {
    const held = this.#locks.get(id)
    if (held && held.expiresAt > this.#now()) return null
    const owner = Symbol(id)
    this.#locks.set(id, { owner, expiresAt: this.#now() + ttlMs })
    return async () => {
      if (this.#locks.get(id)?.owner === owner) this.#locks.delete(id)
    }
  }
}
