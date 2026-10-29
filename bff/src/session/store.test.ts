import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { connectRedis, type RedisConnection, RedisSessionStore } from './redis.ts'
import type { Session } from './session.ts'
import { MemorySessionStore, type SessionStore } from './store.ts'

const session = (n: number): Session => ({
  memberId: 7,
  roles: ['BUYER'],
  accessToken: `access-${n}`,
  accessTokenExpiresAt: Date.now() + 30 * 60_000,
  refreshToken: `refresh-${n}`,
  refreshTokenExpiresAt: Date.now() + 14 * 24 * 60 * 60_000,
})
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let redis: RedisConnection
beforeAll(async () => {
  redis = await connectRedis(inject('redisUrl'))
})
afterAll(() => redis.destroy())

// 같은 약속을 메모리·Redis 구현에 똑같이 확인한다 (ADR-0007)
describe.each([
  ['메모리', () => new MemorySessionStore()],
  ['Redis', () => new RedisSessionStore(redis)],
])('%s 세션 저장소', (_name, createStore: () => SessionStore) => {
  it('저장한 세션을 돌려주고 지우면 null이다', async () => {
    const store = createStore()
    const id = crypto.randomUUID()
    const original = session(1)

    await store.set(id, original, Date.now() + 60_000)
    const saved = await store.get(id)
    await store.delete(id)

    expect(saved).toEqual(original)
    expect(await store.get(id)).toBeNull()
  })

  it('만료 시각이 지난 세션은 돌려주지 않는다', async () => {
    const store = createStore()
    const id = crypto.randomUUID()

    await store.set(id, session(1), Date.now() + 50)
    await sleep(120)

    expect(await store.get(id)).toBeNull()
  })

  it('재발급 락은 한 번에 하나만 잡히고 풀면 다시 잡을 수 있다', async () => {
    const store = createStore()
    const id = crypto.randomUUID()

    const first = await store.lockReissue(id, 5_000)
    const second = await store.lockReissue(id, 5_000)
    await first?.()
    const third = await store.lockReissue(id, 5_000)

    expect(first).not.toBeNull()
    expect(second).toBeNull()
    expect(third).not.toBeNull()
  })

  it('쥔 쪽이 풀지 못해도 재발급 락은 시간이 지나면 풀린다', async () => {
    const store = createStore()
    const id = crypto.randomUUID()

    await store.lockReissue(id, 50)
    await sleep(120)

    expect(await store.lockReissue(id, 5_000)).not.toBeNull()
  })

  it('만료 뒤 늦게 푸는 쪽은 남이 새로 잡은 락을 풀지 않는다', async () => {
    const store = createStore()
    const id = crypto.randomUUID()

    const late = await store.lockReissue(id, 50)
    await sleep(120)
    await store.lockReissue(id, 5_000)
    await late?.()

    expect(await store.lockReissue(id, 5_000)).toBeNull()
  })
})
