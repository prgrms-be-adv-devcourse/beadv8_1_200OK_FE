import { Hono } from 'hono'
import { type AppEnv, authMiddleware } from './auth.ts'
import type { Config } from './config.ts'
import { originGuard } from './originGuard.ts'
import { problem, problemDetail } from './problem.ts'
import { proxyRoutes } from './proxy.ts'
import { productDetailRoutes } from './screens/productDetail.ts'
import { SessionCookie } from './session/cookie.ts'
import { SessionManager } from './session/manager.ts'
import { sessionRoutes } from './session/routes.ts'
import { MemorySessionStore, type SessionStore, SessionStoreUnavailable } from './session/store.ts'
import { Upstream, UpstreamError } from './upstream.ts'

export function createApp(options: { config: Config; store?: SessionStore; now?: () => number }) {
  const { config } = options
  const now = options.now ?? Date.now
  const upstream = new Upstream(config)
  const sessions = new SessionManager({
    store: options.store ?? new MemorySessionStore(now),
    upstream,
    timeoutMs: config.timeouts.upstream,
    now,
  })
  const cookie = new SessionCookie(config.cookieSecure, now)

  const app = new Hono<AppEnv>()
    .get('/health', (c) => c.json({ status: 'UP' }))
    .use(
      originGuard({
        allowedOrigins: config.allowedOrigins,
        allowAnyLocalhostOrigin: config.allowAnyLocalhostOrigin,
        cookie,
      }),
    )
    .use('/api/*', authMiddleware({ sessions, cookie }))
    .use('/bff/*', authMiddleware({ sessions, cookie }))
    .route('/', sessionRoutes({ upstream, sessions, timeoutMs: config.timeouts.upstream }))
    .route('/', productDetailRoutes({ upstream, timeouts: config.timeouts }))
    .route('/', proxyRoutes({ upstream, config }))

  app.notFound((c) => problem(404, problemDetail.notFound, c.req.path))
  app.onError((error, c) => {
    if (error instanceof UpstreamError) {
      return error.kind === 'timeout'
        ? problem(504, problemDetail.upstreamTimeout, c.req.path)
        : problem(502, problemDetail.upstreamUnreachable, c.req.path)
    }
    // 쿠키는 그대로 둔다. 저장소가 돌아오면 같은 세션으로 이어 쓴다 (ADR-0007)
    if (error instanceof SessionStoreUnavailable) {
      console.error(error)
      return problem(503, problemDetail.sessionUnavailable, c.req.path)
    }
    console.error(error)
    return problem(500, problemDetail.internal, c.req.path)
  })
  return app
}

/** 프론트가 hono/client로 쓸 라우트 타입. 프론트는 import type으로만 가져온다 */
export type AppType = ReturnType<typeof createApp>
