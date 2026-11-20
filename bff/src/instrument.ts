// Sentry는 앱 코드보다 먼저 떠야 http·fetch를 계측한다. 그래서 main.ts가 아니라
// `node --import ./src/instrument.ts`로 먼저 읽는다(package.json scripts, Dockerfile CMD).
// SENTRY_DSN이 없으면(테스트·DSN 없는 개발) 아무것도 보내지 않는다.
import * as Sentry from '@sentry/hono/node'
import { sentryInitOptions } from './sentry.ts'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    // environment·release·샘플링(/health 제외, SENTRY_TRACES_SAMPLE_RATE)·통합(Dedupe 뺌, console 로그)
    ...sentryInitOptions(process.env),
  })
}
