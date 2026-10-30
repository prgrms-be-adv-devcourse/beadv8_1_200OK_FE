import { defineConfig } from 'vitest/config'
import { REDIS_TESTS } from './vitest.config.ts'

// 만들어 두고 쓰지 않는 Redis 세션 저장소 테스트. Testcontainers로 실제 Redis를 띄워 Docker가 필요하다
export default defineConfig({
  test: {
    environment: 'node',
    include: REDIS_TESTS,
    setupFiles: ['./src/test/setup.ts'],
    globalSetup: ['./src/test/redis.ts'],
  },
})
