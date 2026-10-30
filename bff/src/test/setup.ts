import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server.ts'

// 핸들러가 없는 백엔드 요청은 테스트를 실패시킨다
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
