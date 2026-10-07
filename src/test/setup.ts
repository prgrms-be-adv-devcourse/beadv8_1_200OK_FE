import '@testing-library/jest-dom/vitest'
import { server } from '@/mocks/server'

// 핸들러에 없는 요청은 실패시켜 실제 네트워크로 새지 않게 한다.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
