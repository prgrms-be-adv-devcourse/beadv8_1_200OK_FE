import { RedisContainer } from '@testcontainers/redis'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    redisUrl: string
  }
}

/**
 * 테스트 전체에서 실제 Redis 하나를 Docker로 띄운다(Testcontainers). Docker가 떠 있어야 한다.
 * MSW가 Docker API 요청까지 가로채지 않도록 테스트 워커 밖(globalSetup)에서 띄우고 주소만 넘긴다
 */
export default async function setup(project: TestProject) {
  const container = await new RedisContainer('redis:8.2-alpine').start()
  project.provide('redisUrl', container.getConnectionUrl())
  return async () => {
    await container.stop()
  }
}
