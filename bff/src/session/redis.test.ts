import { randomBytes } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { connectRedis, type RedisConnection, RedisSessionStore } from './redis.ts'
import type { Session } from './session.ts'

// 쓰지 않는 Redis 세션 저장소의 테스트다(ADR-0009). pnpm --filter @paldo/bff test:redis로 돌린다.
// 앱에 연결해 확인하던 테스트(BFF 두 대의 재발급 락, Redis 장애 503, 키 교체 401)는 커밋 f802724에 있다

const KEY = randomBytes(32)
const session: Session = {
  memberId: 7,
  roles: ['BUYER'],
  accessToken: 'header.access-payload.signature',
  accessTokenExpiresAt: Date.now() + 30 * 60_000,
  refreshToken: 'refresh-token-original',
  refreshTokenExpiresAt: Date.now() + 14 * 24 * 60 * 60_000,
}

let redis: RedisConnection
beforeAll(async () => {
  redis = await connectRedis(inject('redisUrl'))
})
afterAll(() => redis.destroy())

describe('Redis 세션 암호화', () => {
  it('Redis에는 세션을 암호화해서 넣어 토큰 원문이 남지 않는다', async () => {
    const store = new RedisSessionStore(redis, KEY)
    const id = crypto.randomUUID()

    await store.set(id, session, Date.now() + 60_000)
    const raw = await redis.get(`bff:session:${id}`)

    expect(raw).not.toBeNull()
    expect(raw).not.toContain(session.accessToken)
    expect(raw).not.toContain(session.refreshToken)
    expect(await store.get(id)).toEqual(session)
  })

  it('암호화 키가 바뀌면 이전 세션은 없는 것으로 본다 — 다시 로그인한다', async () => {
    const id = crypto.randomUUID()
    await new RedisSessionStore(redis, KEY).set(id, session, Date.now() + 60_000)

    expect(await new RedisSessionStore(redis, randomBytes(32)).get(id)).toBeNull()
  })

  it('한 세션의 값을 다른 세션 ID로 옮겨 붙이면 열리지 않는다', async () => {
    const store = new RedisSessionStore(redis, KEY)
    const [victim, attacker] = [crypto.randomUUID(), crypto.randomUUID()]
    await store.set(victim, session, Date.now() + 60_000)

    await redis.set(`bff:session:${attacker}`, (await redis.get(`bff:session:${victim}`)) ?? '')

    expect(await store.get(attacker)).toBeNull()
  })
})
