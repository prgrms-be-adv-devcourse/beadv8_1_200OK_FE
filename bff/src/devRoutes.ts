import { logger } from '@sentry/hono/node'
import { Hono } from 'hono'

// 개발 환경에서만 등록하는 경로(createApp의 config.devRoutes). 운영 BFF에는 없다.
// 프론트 /__design/sentry가 불러 BFF 오류·로그가 Sentry에 어떻게 올라가는지 본다 (#36)
export function devRoutes() {
  return new Hono().get('/bff/dev/sentry-error', () => {
    const at = new Date().toISOString()
    logger.info('Sentry 테스트: BFF 오류를 일부러 냅니다', { at })
    // onError가 500으로 바꾸고, sentry() 미들웨어가 이 오류를 이슈로 보낸다
    throw new Error(`Sentry test error bff ${at}`)
  })
}
