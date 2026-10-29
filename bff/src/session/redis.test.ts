import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { BACKEND, problemJson, setup } from '../test/fakeBackend.ts'
import { server } from '../test/server.ts'
import { connectRedis, type RedisConnection, RedisSessionStore } from './redis.ts'

let redis: RedisConnection
beforeAll(async () => {
  redis = await connectRedis(inject('redisUrl'))
})
afterAll(() => redis.destroy())

describe('Redis 세션', () => {
  it('Redis를 같이 쓰는 BFF 두 대에 access가 만료된 채 동시에 온 요청은 재발급을 한 번만 한다', async () => {
    const { request, anotherInstance, login, authenticate, clock, calls, ACCESS_MS } = setup({
      store: (now) => new RedisSessionStore(redis, now),
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

  it('Redis에 닿지 못하면 로그아웃시키지 않고 쿠키를 둔 채 503을 준다', async () => {
    const lost = await connectRedis(inject('redisUrl'))
    const { request, login } = setup({ store: (now) => new RedisSessionStore(lost, now) })
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
