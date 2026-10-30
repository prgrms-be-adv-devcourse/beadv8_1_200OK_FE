import { randomUUID } from 'node:crypto'
import { createClient } from 'redis'
import { seal, unseal } from './sealed.ts'
import type { Session } from './session.ts'
import { type ReleaseLock, type SessionStore, SessionStoreUnavailable } from './store.ts'

// ⚠️ 만들어 두고 쓰지 않는 코드다 (ADR-0009, 2026-10-30).
// BFF가 운영에 한 대뿐이라 세션을 여러 서버가 나눠 볼 일이 없어, 세션 저장소 대신 토큰을 HttpOnly 쿠키에 담기로 했다
// (session/cookie.ts·refresher.ts). Redis를 두면 ACL·암호화 키·백엔드 Redis 결정 대기 같은 운영 부담만 생긴다.
// BFF가 여러 대가 되거나 서버에서 세션을 끊어야 하면(강제 로그아웃) 이 코드를 되살린다:
// store.ts(저장소·재발급 락), manager.ts(재발급), sealed.ts(세션 암호화), 이 파일(Redis 구현).
// 앱에 연결돼 있던 모습(설정 REDIS_URL·SESSION_ENCRYPTION_KEY, main.ts 연결, 503 처리, 앱 수준 테스트)은 커밋 f802724에 있다.
// 테스트는 pnpm --filter @paldo/bff test:redis (Docker 필요)

export type RedisConnection = ReturnType<typeof createRedisClient>

const createRedisClient = (url: string) =>
  createClient({
    url,
    // 끊긴 동안 명령을 쌓아 두지 않는다. 기다리게 하지 않고 바로 503으로 돌려준다 (ADR-0007)
    disableOfflineQueue: true,
    socket: { connectTimeout: 2_000 },
    commandOptions: { timeout: 2_000 },
  })

/** 연결은 밖에서 만들어 저장소에 넘긴다. 저장소를 ElastiCache로 옮겨도 여기만 바뀐다 */
export async function connectRedis(url: string): Promise<RedisConnection> {
  const client = createRedisClient(url)
  // error 리스너가 없으면 연결이 끊길 때 프로세스가 죽는다. 클라이언트가 알아서 다시 붙는다
  client.on('error', (error: unknown) => console.error('Redis 연결 오류', error))
  await client.connect()
  return client
}

// 키 하나짜리 명령만 쓴다. 나중에 클러스터로 옮겨도 키가 슬롯 하나에 들어간다
const sessionKey = (id: string) => `bff:session:${id}`
const lockKey = (id: string) => `bff:reissue-lock:${id}`
// 내 값일 때만 지운다. 만료된 뒤 늦게 푸는 쪽이 남이 새로 잡은 락을 지우지 않게 한다
const RELEASE_IF_OWNER = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0`

export class RedisSessionStore implements SessionStore {
  readonly #client: RedisConnection
  readonly #key: Uint8Array
  readonly #now: () => number

  /** key: 세션 암호화 키(32바이트) */
  constructor(client: RedisConnection, key: Uint8Array, now: () => number = Date.now) {
    this.#client = client
    this.#key = key
    this.#now = now
  }

  async get(id: string): Promise<Session | null> {
    const value = await this.#orUnavailable(() => this.#client.get(sessionKey(id)))
    const plaintext = value ? unseal(this.#key, id, value) : null
    return plaintext ? (JSON.parse(plaintext) as Session) : null
  }

  async set(id: string, session: Session, expiresAt: number): Promise<void> {
    const ttl = expiresAt - this.#now()
    if (ttl <= 0) return this.delete(id)
    await this.#orUnavailable(() =>
      this.#client.set(sessionKey(id), seal(this.#key, id, JSON.stringify(session)), {
        expiration: { type: 'PX', value: ttl },
      }),
    )
  }

  async delete(id: string): Promise<void> {
    await this.#orUnavailable(() => this.#client.del(sessionKey(id)))
  }

  async lockReissue(id: string, ttlMs: number): Promise<ReleaseLock | null> {
    const owner = randomUUID()
    const acquired = await this.#orUnavailable(() =>
      this.#client.set(lockKey(id), owner, {
        condition: 'NX',
        expiration: { type: 'PX', value: ttlMs },
      }),
    )
    if (acquired === null) return null
    return async () => {
      await this.#orUnavailable(() =>
        this.#client.eval(RELEASE_IF_OWNER, { keys: [lockKey(id)], arguments: [owner] }),
      )
    }
  }

  async #orUnavailable<T>(command: () => Promise<T>): Promise<T> {
    try {
      return await command()
    } catch (error) {
      throw new SessionStoreUnavailable(error)
    }
  }
}
