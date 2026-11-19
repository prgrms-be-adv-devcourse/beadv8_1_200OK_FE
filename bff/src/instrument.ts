// Sentry는 앱 코드보다 먼저 떠야 http·fetch를 계측한다. 그래서 main.ts가 아니라
// `node --import ./src/instrument.ts`로 먼저 읽는다(package.json scripts, Dockerfile CMD).
// SENTRY_DSN이 없으면(테스트·DSN 없는 개발) 아무것도 보내지 않는다.
import * as Sentry from '@sentry/hono/node'

const dsn = process.env.SENTRY_DSN
const isProduction = process.env.NODE_ENV === 'production'

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    // 개발은 모든 트레이스를 본다. 운영은 10%부터 시작한다
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    integrations: [Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] })],
  })
}
