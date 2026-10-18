import { HttpResponse, http } from 'msw'
import { server } from '@/mocks/server'
import { fakeToken } from '@/test/token'
import { ApiError } from './ApiError'
import { clearAccessToken, getAuthSession, onSessionEnd, setAccessToken } from './authToken'
import { apiClient, onUnauthorized } from './client'
import { needsMemberHeaders } from './memberHeaders'
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

  it('임시 헤더 API는 토큰이 거절되면(401) 다시 보내지 않고 세션을 끝낸 뒤 onUnauthorized를 부른다', async () => {
    let calls = 0
    server.use(
      http.get('*/api/v1/payouts', () => {
        calls += 1
        return problem(401, '토큰이 만료되었습니다.')
      }),
    )
    const handler = vi.fn()
    const off = onUnauthorized(handler)
    setAccessToken(fakeToken({ memberId: 6, role: MemberRole.SELLER }))
    await expect(apiClient.get('/api/v1/payouts')).rejects.toMatchObject({ status: 401 })
    expect(calls).toBe(1)
    expect(getAuthSession()).toBeNull()
    expect(handler).toHaveBeenCalledTimes(1)
    off()
  })

  it('임시 헤더 API에는 토큰의 회원 번호 · 역할을 X-Member-*로 붙인다', async () => {
    let headers: Headers | null = null
    server.use(
      http.get('*/api/v1/payouts', ({ request }) => {
        headers = request.headers
        return HttpResponse.json({ content: [] })
      }),
    )
    setAccessToken(fakeToken({ memberId: 1, role: MemberRole.ADMIN }))
    await apiClient.get('/api/v1/payouts', { params: { from: '2026-10-01T00:00:00' } })
    expect(headers).not.toBeNull()
    const sent = headers as unknown as Headers
    expect(sent.get('X-Member-Id')).toBe('1')
    expect(sent.get('X-Member-Role')).toBe('ADMIN')
  })
})

describe('needsMemberHeaders', () => {
  it.each([
    ['post', '/api/v1/products', true],
    ['put', '/api/v1/products/12', true],
    ['patch', '/api/v1/products/12/status', true],
    ['delete', '/api/v1/products/12', true],
    ['get', '/api/v1/payouts/3/items?page=0', true],
    ['get', '/api/v1/products', false],
    ['get', '/api/v1/products/12', false],
    ['post', '/api/v1/products/12/reviews', false],
  ])('%s %s → %s', (method, url, expected) => {
    expect(needsMemberHeaders(method, url)).toBe(expected)
  })
})
