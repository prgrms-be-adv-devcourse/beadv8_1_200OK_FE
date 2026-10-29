import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.ts'

const SESSION_ENCRYPTION_KEY = randomBytes(32).toString('base64')

describe('세션 저장소 설정', () => {
  it('REDIS_URL을 주면 Redis 주소와 세션 암호화 키를 쓴다', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      REDIS_URL: 'redis://bff:secret@redis:6379',
      SESSION_ENCRYPTION_KEY,
    })

    expect(config.redis).toEqual({
      url: 'redis://bff:secret@redis:6379',
      encryptionKey: Buffer.from(SESSION_ENCRYPTION_KEY, 'base64'),
    })
  })

  it('개발 환경은 REDIS_URL이 없으면 메모리 저장소를 쓴다', () => {
    expect(loadConfig({ NODE_ENV: 'development' }).redis).toBeNull()
  })

  it('운영에서 REDIS_URL이 없으면 시작하지 않는다', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('REDIS_URL')
  })

  it('REDIS_URL이 있는데 세션 암호화 키가 없거나 32바이트가 아니면 시작하지 않는다', () => {
    const redisUrl = 'redis://localhost:6379'

    expect(() => loadConfig({ REDIS_URL: redisUrl })).toThrow('SESSION_ENCRYPTION_KEY')
    expect(() =>
      loadConfig({
        REDIS_URL: redisUrl,
        SESSION_ENCRYPTION_KEY: randomBytes(16).toString('base64'),
      }),
    ).toThrow('SESSION_ENCRYPTION_KEY')
    // base64가 아닌 글자를 건너뛰고 읽으면 32바이트가 되는 오타
    expect(() =>
      loadConfig({ REDIS_URL: redisUrl, SESSION_ENCRYPTION_KEY: `${'a'.repeat(43)}!=` }),
    ).toThrow('SESSION_ENCRYPTION_KEY')
  })
})
