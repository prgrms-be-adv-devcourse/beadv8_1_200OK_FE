import { HttpResponse, http } from 'msw'
import { server } from '@/mocks/server'
import { fakeToken } from '@/test/token'
import { ApiError } from './ApiError'
import {
  clearAccessToken,
  getAuthSession,
  getRefreshToken,
  onSessionEnd,
  setAccessToken,
} from './authToken'
import { apiClient, onUnauthorized } from './client'
import { MemberRole } from './types'

const problem = (status: number, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/x', ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

afterEach(() => clearAccessToken())

describe('apiClient', () => {
  it('로그인했으면 Bearer를 붙이고, 아니면 붙이지 않는다', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.get('*/api/v1/cart', ({ request }) => {
        seen.push(request.headers.get('Authorization'))
        return HttpResponse.json({})
      }),
    )
    await apiClient.get('/api/v1/cart')
    const token = fakeToken({ role: MemberRole.BUYER })
    setAccessToken(token)
    await apiClient.get('/api/v1/cart')
    expect(seen).toEqual([null, `Bearer ${token}`])
  })

  it('422는 ApiError로 바꾸고 errors[].path를 필드 오류로 모은다', async () => {
    server.use(
      http.post('*/api/v1/members/signup', () =>
        problem(422, '요청 값이 올바르지 않습니다.', {
          errors: [
            { detail: '이메일 형식이 올바르지 않습니다.', pointer: '/email', path: 'email' },
            { detail: '닉네임은 2~30자여야 합니다.', pointer: '/nickname', path: 'nickname' },
          ],
        }),
      ),
    )
    const error = await apiClient.post('/api/v1/members/signup', {}).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, detail: '요청 값이 올바르지 않습니다.' })
    expect((error as ApiError).fieldErrors).toEqual({
      email: '이메일 형식이 올바르지 않습니다.',
      nickname: '닉네임은 2~30자여야 합니다.',
    })
  })

  it('detail이 없는 응답 · 연결 실패도 사용자 문구를 갖는다', async () => {
    server.use(
      http.get('*/api/v1/products', () => new HttpResponse(null, { status: 503 })),
      http.get('*/api/v1/products/categories', () => HttpResponse.error()),
    )
    await expect(apiClient.get('/api/v1/products')).rejects.toMatchObject({
      status: 503,
      detail: '서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요',
    })
    await expect(apiClient.get('/api/v1/products/categories')).rejects.toMatchObject({ status: 0 })
  })

  it('비회원이 로그인이 필요한 API에서 401이면 onUnauthorized를 부른다', async () => {
    const handler = vi.fn()
    const off = onUnauthorized(handler)
    server.use(http.get('*/api/v1/cart', () => problem(401, '로그인이 필요합니다.')))
    await expect(apiClient.get('/api/v1/cart')).rejects.toMatchObject({ status: 401 })
    expect(handler).toHaveBeenCalledTimes(1)
    off()
  })

  it('skipAuthRedirect면 401이어도 부르지 않는다 (로그인 실패)', async () => {
    const handler = vi.fn()
    const off = onUnauthorized(handler)
    server.use(
      http.post('*/api/v1/auth/login', () =>
        problem(401, '아이디 또는 비밀번호가 올바르지 않습니다.'),
      ),
    )
    await expect(
      apiClient.post('/api/v1/auth/login', {}, { skipAuthRedirect: true }),
    ).rejects.toMatchObject({ detail: '아이디 또는 비밀번호가 올바르지 않습니다.' })
    expect(handler).not.toHaveBeenCalled()
    off()
  })

  it('토큰이 거절되면(401) 세션을 만료시키고 토큰 없이 한 번 더 보낸다 → 공개 API는 그대로 성공', async () => {
    const ended = vi.fn()
    const offEnd = onSessionEnd(ended)
    server.use(
      http.get('*/api/v1/products/categories', ({ request }) =>
        request.headers.has('Authorization')
          ? problem(401, '유효하지 않은 토큰입니다.')
          : HttpResponse.json([{ group: 'FRUIT_VEGETABLE' }]),
      ),
    )
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    const { data } = await apiClient.get('/api/v1/products/categories')
    expect(data).toEqual([{ group: 'FRUIT_VEGETABLE' }])
    expect(getAuthSession()).toBeNull()
    expect(ended).toHaveBeenCalledWith('expired')
    offEnd()
  })

  it('토큰이 만료됐다고 401이 오면 refreshToken으로 한 번 재발급하고 같은 요청을 다시 보낸다', async () => {
    const seen: string[] = []
    let reissues = 0
    const fresh = fakeToken({ role: MemberRole.BUYER, memberId: 2 })
    server.use(
      http.get('*/api/v1/cart', ({ request }) => {
        const auth = request.headers.get('Authorization') ?? ''
        seen.push(auth)
        return auth === `Bearer ${fresh}`
          ? HttpResponse.json({ cartId: 1, items: [] })
          : problem(401, '토큰이 만료되었습니다.')
      }),
      http.post('*/api/v1/auth/reissue', async ({ request }) => {
        reissues += 1
        const body = (await request.json()) as { refreshToken: string }
        expect(body.refreshToken).toBe('refresh-old')
        return HttpResponse.json({
          tokenType: 'Bearer',
          accessToken: fresh,
          accessTokenExpiresAt: '',
          refreshToken: 'refresh-new',
          refreshTokenExpiresAt: '',
        })
      }),
    )
    const stale = fakeToken({ role: MemberRole.BUYER, memberId: 2, expiresInSec: 600 })
    setAccessToken(stale, 'refresh-old')

    const { data } = await apiClient.get('/api/v1/cart')
    expect(data).toEqual({ cartId: 1, items: [] })
    expect(reissues).toBe(1)
    expect(seen).toEqual([`Bearer ${stale}`, `Bearer ${fresh}`])
    expect(getAuthSession()?.accessToken).toBe(fresh)
    expect(getRefreshToken()).toBe('refresh-new')
  })

  it('동시에 여러 요청이 만료를 만나도 재발급은 한 번만 한다', async () => {
    let reissues = 0
    // 같은 초에 만든 같은 payload는 문자열이 같아지므로 회원 번호를 달리해 구분한다
    const fresh = fakeToken({ role: MemberRole.BUYER, memberId: 20 })
    server.use(
      http.get('*/api/v1/cart', ({ request }) =>
        request.headers.get('Authorization') === `Bearer ${fresh}`
          ? HttpResponse.json({ cartId: 1, items: [] })
          : problem(401, '토큰이 만료되었습니다.'),
      ),
      http.get('*/api/v1/orders', ({ request }) =>
        request.headers.get('Authorization') === `Bearer ${fresh}`
          ? HttpResponse.json({ content: [] })
          : problem(401, '토큰이 만료되었습니다.'),
      ),
      http.post('*/api/v1/auth/reissue', async () => {
        reissues += 1
        await new Promise((resolve) => setTimeout(resolve, 20))
        return HttpResponse.json({ accessToken: fresh, refreshToken: 'r2' })
      }),
    )
    setAccessToken(fakeToken({ role: MemberRole.BUYER, memberId: 10 }), 'r1')
    const [cart, orders] = await Promise.all([
      apiClient.get('/api/v1/cart'),
      apiClient.get('/api/v1/orders'),
    ])
    expect(cart.data).toEqual({ cartId: 1, items: [] })
    expect(orders.data).toEqual({ content: [] })
    expect(reissues).toBe(1)
  })

  it('재발급도 거절되면 세션을 끝내고 토큰 없이 다시 보낸 뒤 onUnauthorized를 부른다', async () => {
    let calls = 0
    server.use(
      http.get('*/api/v1/cart', () => {
        calls += 1
        return problem(401, calls === 1 ? '토큰이 만료되었습니다.' : '로그인이 필요합니다.')
      }),
      http.post('*/api/v1/auth/reissue', () => problem(401, '유효하지 않은 Refresh Token입니다.')),
    )
    const handler = vi.fn()
    const ended = vi.fn()
    const off = onUnauthorized(handler)
    const offEnd = onSessionEnd(ended)
    setAccessToken(fakeToken({ role: MemberRole.BUYER }), 'r1')

    await expect(apiClient.get('/api/v1/cart')).rejects.toMatchObject({ status: 401 })
    expect(calls).toBe(2)
    expect(getAuthSession()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(ended).toHaveBeenCalledWith('expired')
    expect(handler).toHaveBeenCalledTimes(1)
    off()
    offEnd()
  })

  it('access가 이미 만료됐고 refreshToken이 있으면 요청 전에 먼저 재발급한다', async () => {
    const fresh = fakeToken({ role: MemberRole.BUYER, memberId: 20 })
    const seen: (string | null)[] = []
    server.use(
      http.get('*/api/v1/cart', ({ request }) => {
        seen.push(request.headers.get('Authorization'))
        return HttpResponse.json({ cartId: 1, items: [] })
      }),
      http.post('*/api/v1/auth/reissue', () =>
        HttpResponse.json({ accessToken: fresh, refreshToken: 'r2' }),
      ),
    )
    // 5초 안에 만료될 토큰은 이미 만료로 본다(skew)
    setAccessToken(fakeToken({ role: MemberRole.BUYER, expiresInSec: 2 }), 'r1')
    await apiClient.get('/api/v1/cart')
    expect(seen).toEqual([`Bearer ${fresh}`])
  })

  it('만료가 아닌 거절(위조 등)은 재발급하지 않고 세션을 끝낸다', async () => {
    let reissues = 0
    server.use(
      http.get('*/api/v1/products/categories', ({ request }) =>
        request.headers.has('Authorization')
          ? problem(401, '유효하지 않은 토큰입니다.')
          : HttpResponse.json([]),
      ),
      http.post('*/api/v1/auth/reissue', () => {
        reissues += 1
        return HttpResponse.json({})
      }),
    )
    setAccessToken(fakeToken({ role: MemberRole.BUYER }), 'r1')
    await apiClient.get('/api/v1/products/categories')
    expect(reissues).toBe(0)
    expect(getAuthSession()).toBeNull()
  })
})
