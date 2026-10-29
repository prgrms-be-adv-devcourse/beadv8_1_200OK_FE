import { Hono } from 'hono'
import type { AppEnv } from '../auth.ts'
import { problem, problemDetail } from '../problem.ts'
import { relay, type Upstream } from '../upstream.ts'
import type { SessionManager } from './manager.ts'
import { type TokenResponse, toSessionView } from './session.ts'

// 쿠키 세션 API. 1단계에서는 프론트가 아직 쓰지 않는다 (ADR-0006).
// 토큰은 응답에 싣지 않고 세션 저장소에만 둔다
export function sessionRoutes(deps: {
  upstream: Upstream
  sessions: SessionManager
  timeoutMs: number
}) {
  return (
    new Hono<AppEnv>()
      .post('/bff/session/login', async (c) => {
        const body = await c.req.text()
        const response = await deps.upstream.fetch('member', '/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, application/problem+json',
          },
          body,
          timeoutMs: deps.timeoutMs,
        })
        // 아이디·비밀번호 불일치(401), 이용 정지(403), 검증 실패(422)는 백엔드 문구 그대로
        if (!response.ok) return relay(response)

        // 이전 세션을 이어 쓰지 않는다(세션 고정 방지)
        await c.var.auth.end()
        const { id, session } = await deps.sessions.create((await response.json()) as TokenResponse)
        c.var.auth.use(id, session, true)
        return c.json(toSessionView(session))
      })
      .get('/bff/session', (c) => {
        const session = c.var.auth.session
        if (!session) return problem(401, problemDetail.loginRequired, c.req.path)
        return c.json(toSessionView(session))
      })
      // 판매자 승인처럼 역할이 바뀐 뒤 새 토큰을 받는다
      .post('/bff/session/refresh', async (c) => {
        if (!(await c.var.auth.refresh({ staleOnly: false }))) {
          return problem(401, problemDetail.loginRequired, c.req.path)
        }
        const session = c.var.auth.session
        if (!session) return problem(401, problemDetail.loginRequired, c.req.path)
        return c.json(toSessionView(session))
      })
      // 백엔드에 로그아웃 API가 없다. refresh를 가진 곳이 이 세션뿐이라 지우면 다시 쓸 수 없다
      .post('/bff/session/logout', async (c) => {
        await c.var.auth.end()
        return c.body(null, 204)
      })
  )
}
