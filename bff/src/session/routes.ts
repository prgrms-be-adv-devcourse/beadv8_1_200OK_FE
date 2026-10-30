import { Hono } from 'hono'
import type { AppEnv } from '../auth.ts'
import { problem, problemDetail } from '../problem.ts'
import { relay, type Upstream } from '../upstream.ts'
import { sessionFromTokens, type TokenResponse, toSessionView } from './session.ts'

// 쿠키 세션 API. 1단계에서는 프론트가 아직 쓰지 않는다 (ADR-0006).
// 토큰은 응답 본문에 싣지 않고 HttpOnly 쿠키에만 둔다 (ADR-0009)
export function sessionRoutes(deps: { upstream: Upstream; timeoutMs: number }) {
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

        const session = sessionFromTokens((await response.json()) as TokenResponse)
        c.var.auth.replaceTokens(session)
        return c.json(toSessionView(session))
      })
      // refresh 쿠키가 이 경로에도 실리므로 access가 만료됐으면 여기서 재발급한다
      .get('/bff/session', async (c) => {
        const auth = c.var.auth
        const view = auth.view ?? ((await auth.refresh()) ? auth.view : null)
        if (!view) return problem(401, problemDetail.loginRequired, c.req.path)
        return c.json(view)
      })
      // access가 만료돼 /api가 401을 줬을 때, 또는 판매자 승인처럼 역할이 바뀐 뒤 새 토큰을 받는다
      .post('/bff/session/refresh', async (c) => {
        const auth = c.var.auth
        const view = (await auth.refresh()) ? auth.view : null
        if (!view) return problem(401, problemDetail.loginRequired, c.req.path)
        return c.json(view)
      })
      // 백엔드에 로그아웃 API가 없어 refresh를 서버에서 끊지 못한다. 쿠키만 지운다 (ADR-0009)
      .post('/bff/session/logout', (c) => {
        c.var.auth.end()
        return c.body(null, 204)
      })
  )
}
