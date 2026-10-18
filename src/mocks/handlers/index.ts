import type { RequestHandler } from 'msw'
import { productHandlers } from './products'

// 테스트 기본 핸들러. feature별 핸들러를 만들면 여기 모은다. 테스트마다 다른 응답은 server.use(...)로 덮는다.
export const handlers: RequestHandler[] = [...productHandlers]
