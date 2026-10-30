import { Hono } from 'hono'
import { type AppEnv, authMiddleware } from './auth.ts'
import type { Config } from './config.ts'
import { originGuard } from './originGuard.ts'
import { problem, problemDetail } from './problem.ts'
import { proxyRoutes } from './proxy.ts'
import { productDetailRoutes } from './screens/productDetail.ts'
import { TokenCookies } from './session/cookie.ts'
import { TokenRefresher } from './session/refresher.ts'
import { sessionRoutes } from './session/routes.ts'
import { Upstream, UpstreamError } from './upstream.ts'

export function createApp(options: { config: Config; now?: () => number }) {
  const { config } = options
  const now = options.now ?? Date.now
  const upstream = new Upstream(config)
  const refresher = new TokenRefresher({ upstream, timeoutMs: config.timeouts.upstream, now })
  const cookies = new TokenCookies(config.cookieSecure, now)

  const app = new Hono<AppEnv>()
    .get('/health', (c) => c.json({ status: 'UP' }))
    .use(
      originGuard({
        allowedOrigins: config.allowedOrigins,
        allowAnyLocalhostOrigin: config.allowAnyLocalhostOrigin,
        cookies,
      }),
    )
    .use('/api/*', authMiddleware({ refresher, cookies }))
    .use('/bff/*', authMiddleware({ refresher, cookies }))
    .route('/', sessionRoutes({ upstream, timeoutMs: config.timeouts.upstream }))
    .route('/', productDetailRoutes({ upstream, timeouts: config.timeouts }))
    .route('/', proxyRoutes({ upstream, config }))

  app.notFound((c) => problem(404, problemDetail.notFound, c.req.path))
  app.onError((error, c) => {
    if (error instanceof UpstreamError) {
      return error.kind === 'timeout'
        ? problem(504, problemDetail.upstreamTimeout, c.req.path)
        : problem(502, problemDetail.upstreamUnreachable, c.req.path)
    }
    console.error(error)
    return problem(500, problemDetail.internal, c.req.path)
  })
  return app
}

/** 프론트가 hono/client로 쓸 라우트 타입. 프론트는 import type으로만 가져온다 */
export type AppType = ReturnType<typeof createApp>
