import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Vitest 전용 MSW 서버 (src/test/setup.ts에서 시작). 처리하지 않은 요청은 실패로 본다.
export const server = setupServer(...handlers)
