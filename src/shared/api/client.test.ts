import { HttpResponse, http } from 'msw/http'
import { server } from '@/mocks/server'
import { type AuthAdapter, cookieAuthAdapter, setAuthAdapter } from './auth-adapter'
import { apiClient } from './client'
import { API_ERROR_CODES, ApiError, isApiError } from './error'
import { onUnauthorized } from './unauthorized'

const unauthorizedBody = { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' }

async function expectApiError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (isApiError(error)) {
      return error
    }
    throw new Error(`ApiError가 아닌 오류: ${String(error)}`)
  }
  throw new Error('오류가 발생하지 않았다')
}

describe('apiClient', () => {
  afterEach(() => {
    setAuthAdapter(cookieAuthAdapter)
  })

  it('성공 응답의 data를 돌려준다', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.json({ ok: true })))

    const { data } = await apiClient.get<{ ok: boolean }>('/ping')

    expect(data).toEqual({ ok: true })
  })

  it('쿠키 전송을 위해 withCredentials가 켜져 있다', () => {
    expect(apiClient.defaults.withCredentials).toBe(true)
  })

  it('백엔드 오류 본문을 ApiError{status, code, message, details}로 정규화한다', async () => {
    server.use(
      http.post('*/api/orders', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: '입력값을 확인해 주세요.',
            details: { quantity: ['1 이상이어야 합니다.'] },
          },
          { status: 400 },
        ),
      ),
    )

    const error = await expectApiError(apiClient.post('/orders', {}))

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBe('VALIDATION_FAILED')
    expect(error.message).toBe('입력값을 확인해 주세요.')
    expect(error.details).toEqual({ quantity: ['1 이상이어야 합니다.'] })
    expect(error.isClientError).toBe(true)
  })

  it('계약 형식이 아닌 오류 본문은 UNKNOWN 코드로 감싼다', async () => {
    server.use(http.get('*/api/boom', () => HttpResponse.text('oops', { status: 500 })))

    const error = await expectApiError(apiClient.get('/boom'))

    expect(error.status).toBe(500)
    expect(error.code).toBe(API_ERROR_CODES.UNKNOWN)
    expect(error.isClientError).toBe(false)
  })

  it('네트워크 단절은 status 0, NETWORK_ERROR 코드로 정규화한다', async () => {
    server.use(http.get('*/api/offline', () => HttpResponse.error()))

    const error = await expectApiError(apiClient.get('/offline'))

    expect(error.status).toBe(0)
    expect(error.code).toBe(API_ERROR_CODES.NETWORK)
    expect(error.isNetworkError).toBe(true)
  })

  it('401이면 onUnauthorized 핸들러를 1회 호출하고 ApiError를 던진다', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(unauthorizedBody, { status: 401 })))
    const handler = vi.fn()
    const unsubscribe = onUnauthorized(handler)

    const error = await expectApiError(apiClient.get('/me'))
    unsubscribe()

    expect(error.isUnauthorized).toBe(true)
    expect(error.code).toBe('UNAUTHORIZED')
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(error)
  })

  it('skipUnauthorizedHandler 요청의 401은 핸들러를 호출하지 않는다', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          { code: 'INVALID_CREDENTIALS', message: '비밀번호가 틀렸습니다.' },
          { status: 401 },
        ),
      ),
    )
    const handler = vi.fn()
    const unsubscribe = onUnauthorized(handler)

    const error = await expectApiError(
      apiClient.post('/auth/login', {}, { skipUnauthorizedHandler: true }),
    )
    unsubscribe()

    expect(error.status).toBe(401)
    expect(error.code).toBe('INVALID_CREDENTIALS')
    expect(handler).not.toHaveBeenCalled()
  })

  it('해제된 핸들러는 호출되지 않는다', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(unauthorizedBody, { status: 401 })))
    const handler = vi.fn()
    onUnauthorized(handler)()

    await expectApiError(apiClient.get('/me'))

    expect(handler).not.toHaveBeenCalled()
  })

  describe('인증 어댑터', () => {
    it('attach가 붙인 헤더가 요청에 실린다', async () => {
      let received: string | null = null
      server.use(
        http.get('*/api/me', ({ request }) => {
          received = request.headers.get('authorization')
          return HttpResponse.json({ id: 1 })
        }),
      )
      setAuthAdapter({
        attach: (config) => {
          config.headers.set('Authorization', 'Bearer test-token')
          return config
        },
        handleUnauthorized: cookieAuthAdapter.handleUnauthorized,
      })

      await apiClient.get('/me')

      expect(received).toBe('Bearer test-token')
    })

    it('401 복구에 성공하면 원 요청을 1회 재시도하고 핸들러를 호출하지 않는다', async () => {
      let calls = 0
      server.use(
        http.get('*/api/me', () => {
          calls += 1
          return calls === 1
            ? HttpResponse.json(unauthorizedBody, { status: 401 })
            : HttpResponse.json({ id: 1 })
        }),
      )
      const refresh = vi.fn().mockResolvedValue(undefined)
      const tokenAdapter: AuthAdapter = {
        attach: (config) => config,
        handleUnauthorized: async (_error, retry) => {
          await refresh()
          return retry()
        },
      }
      setAuthAdapter(tokenAdapter)
      const handler = vi.fn()
      const unsubscribe = onUnauthorized(handler)

      const { data } = await apiClient.get('/me')
      unsubscribe()

      expect(data).toEqual({ id: 1 })
      expect(calls).toBe(2)
      expect(refresh).toHaveBeenCalledTimes(1)
      expect(handler).not.toHaveBeenCalled()
    })

    it('재시도도 401이면 더 재시도하지 않고 핸들러를 1회만 호출한다', async () => {
      let calls = 0
      server.use(
        http.get('*/api/me', () => {
          calls += 1
          return HttpResponse.json(unauthorizedBody, { status: 401 })
        }),
      )
      const refresh = vi.fn().mockResolvedValue(undefined)
      setAuthAdapter({
        attach: (config) => config,
        handleUnauthorized: async (_error, retry) => {
          await refresh()
          return retry()
        },
      })
      const handler = vi.fn()
      const unsubscribe = onUnauthorized(handler)

      const error = await expectApiError(apiClient.get('/me'))
      unsubscribe()

      expect(error.isUnauthorized).toBe(true)
      expect(calls).toBe(2)
      expect(refresh).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })
})
