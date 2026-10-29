import { createMiddleware } from 'hono/factory'
import { problem, problemDetail } from './problem.ts'
import type { SessionCookie } from './session/cookie.ts'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

// CSRF: 쿠키는 SameSite=Lax라 다른 사이트의 POST에 실리지 않지만, 같은 사이트의 다른 오리진은 막지 못한다.
// 상태를 바꾸는 요청은 Origin이 허용 목록에 있어야 한다. Origin이 없으면 쿠키를 싣지 않은 요청만 받는다 (ADR-0006)
export function originGuard(deps: {
  allowedOrigins: string[]
  allowAnyLocalhostOrigin: boolean
  cookie: SessionCookie
}) {
  const allowed = new Set(deps.allowedOrigins)
  const isAllowed = (origin: string) =>
    allowed.has(origin) || (deps.allowAnyLocalhostOrigin && LOCALHOST_ORIGIN.test(origin))
  return createMiddleware(async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) return next()
    const origin = c.req.header('Origin')
    const rejected = origin ? !isAllowed(origin) : deps.cookie.read(c) !== null
    if (rejected) return problem(403, problemDetail.forbiddenOrigin, c.req.path)
    return next()
  })
}
