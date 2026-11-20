import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const PATH = '/bff/dev/sentry-error'

describe('개발 전용 Sentry 테스트 경로', () => {
  afterEach(() => vi.restoreAllMocks())

  it('개발 환경에서는 일부러 오류를 내고 500 problem으로 답한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createApp({ config: loadConfig({ NODE_ENV: 'development' }) })

    const response = await app.request(PATH)

    expect(response.status).toBe(500)
    expect(response.headers.get('Content-Type')).toContain('application/problem+json')
  })

  it('운영 환경에는 경로가 없다', async () => {
    const app = createApp({ config: loadConfig({ NODE_ENV: 'production' }) })

    const response = await app.request(PATH)

    expect(response.status).toBe(404)
  })
})
