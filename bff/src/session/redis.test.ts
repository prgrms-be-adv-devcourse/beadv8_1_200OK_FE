import { randomBytes } from 'node:crypto'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { BACKEND, problemJson, setup } from '../test/fakeBackend.ts'
import { server } from '../test/server.ts'
import { connectRedis, type RedisConnection, RedisSessionStore } from './redis.ts'
import type { Session } from './session.ts'

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

describe('Redis 세션', () => {
  it('Redis를 같이 쓰는 BFF 두 대에 access가 만료된 채 동시에 온 요청은 재발급을 한 번만 한다', async () => {
    const { request, anotherInstance, login, authenticate, clock, calls, ACCESS_MS } = setup({
      store: (now) => new RedisSessionStore(redis, KEY, now),
    })
    const other = anotherInstance()
    const { cookie } = await login()
    server.use(
      http.get(`${BACKEND}/api/v1/orders`, ({ request }) =>
        authenticate(request) === 'ok' ? HttpResponse.json([]) : problemJson(401, '만료'),
      ),
    )
    clock.now += ACCESS_MS + 1

    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, i) => (i % 2 ? other : request)('/api/v1/orders', { cookie })),
    )

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200, 200])
    expect(calls.reissue).toBe(1)
  })

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

  it('암호화 키를 바꿔 배포하면 기존 쿠키는 503이 아니라 401과 함께 지워진다', async () => {
    const { login } = setup({ store: (now) => new RedisSessionStore(redis, KEY, now) })
    const { cookie } = await login()
    const rotated = setup({ store: (now) => new RedisSessionStore(redis, randomBytes(32), now) })

    const response = await rotated.request('/bff/session', { cookie })

    expect(response.status).toBe(401)
    expect(response.headers.getSetCookie().join()).toContain('Max-Age=0')
  })

  it('한 세션의 값을 다른 세션 ID로 옮겨 붙이면 열리지 않는다', async () => {
    const store = new RedisSessionStore(redis, KEY)
    const [victim, attacker] = [crypto.randomUUID(), crypto.randomUUID()]
    await store.set(victim, session, Date.now() + 60_000)

    await redis.set(`bff:session:${attacker}`, (await redis.get(`bff:session:${victim}`)) ?? '')

    expect(await store.get(attacker)).toBeNull()
  })

  it('Redis에 닿지 못하면 로그아웃시키지 않고 쿠키를 둔 채 503을 준다', async () => {
    const lost = await connectRedis(inject('redisUrl'))
    const { request, login } = setup({ store: (now) => new RedisSessionStore(lost, KEY, now) })
    const { cookie } = await login()
    lost.destroy()

    const response = await request('/bff/session', { cookie })

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      status: 503,
      detail: '로그인 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요',
    })
    expect(response.headers.getSetCookie()).toEqual([])
  })
})
