import { defineConfig } from 'vitest/config'

// 쓰지 않는 Redis 세션 저장소 테스트(Docker 필요)는 기본 실행에서 뺀다. vitest.redis.config.ts (ADR-0009)
export const REDIS_TESTS = ['src/session/store.test.ts', 'src/session/redis.test.ts']

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: REDIS_TESTS,
    setupFiles: ['./src/test/setup.ts'],
  },
})
