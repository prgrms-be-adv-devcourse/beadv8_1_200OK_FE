import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.ts'

describe('세션 저장소 설정', () => {
  it('REDIS_URL을 주면 Redis 주소로 쓴다', () => {
    const config = loadConfig({ NODE_ENV: 'production', REDIS_URL: 'redis://redis-bff:6379' })

    expect(config.redisUrl).toBe('redis://redis-bff:6379')
  })

  it('개발 환경은 REDIS_URL이 없으면 메모리 저장소를 쓴다', () => {
    expect(loadConfig({ NODE_ENV: 'development' }).redisUrl).toBeNull()
  })

  it('운영에서 REDIS_URL이 없으면 시작하지 않는다', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('REDIS_URL')
  })
})
