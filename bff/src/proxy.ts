import { Hono } from 'hono'
import type { AppEnv } from './auth.ts'
import type { Config } from './config.ts'
import { readProblemDetail } from './problem.ts'
import { HOP_BY_HOP, moduleForPath, relay, type Upstream } from './upstream.ts'

// /api/v1/*을 경로 그대로 백엔드 모듈로 넘긴다. 프론트 feature의 요청 경로는 바뀌지 않는다 (ADR-0006).
// 세션이 있으면 토큰을 붙이고, 백엔드가 만료로 거절하면 한 번 재발급해 다시 보낸다.
// 만료가 아닌 거절이거나 재발급이 안 되면 세션을 끝내고 토큰 없이 한 번 더 보낸다(공개 API도 잘못된 토큰엔 401을 준다)

// host는 백엔드 주소로 바뀌고, cookie에는 BFF 세션 id가 있어 넘기지 않는다.
// content-length는 본문을 다시 만들거나 스트리밍하므로 fetch가 다시 정한다
const DROP_REQUEST = new Set([...HOP_BY_HOP, 'host', 'cookie', 'authorization', 'content-length'])

const TOKEN_EXPIRED_DETAIL = '토큰이 만료되었습니다.'

function forwardHeaders(request: Request, authorization: string | null): Headers {
  const headers = new Headers()
  request.headers.forEach((value, key) => {
    if (!DROP_REQUEST.has(key)) headers.set(key, value)
  })
  if (authorization) headers.set('Authorization', authorization)
  const url = new URL(request.url)
  headers.set('X-Forwarded-Host', request.headers.get('host') ?? url.host)
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''))
  return headers
}

export function proxyRoutes(deps: { upstream: Upstream; config: Config }) {
  return new Hono<AppEnv>().all('/api/v1/*', async (c) => {
    const auth = c.var.auth
    const request = c.req.raw
    const url = new URL(request.url)
    const pathAndQuery = `${url.pathname}${url.search}`
    const module = moduleForPath(url.pathname)
    const multipart = request.headers.get('content-type')?.startsWith('multipart/') ?? false
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD'

    // 업로드(최대 30MB)는 메모리에 담지 않고 흘려보낸다. 대신 다시 보낼 수 없어서 재시도하지 않는다.
    // 그 밖의 본문은 작아서 담아 두고 재발급 뒤 다시 보낸다
    const body = hasBody && !multipart ? await request.arrayBuffer() : null
    const replayable = !hasBody || body !== null

    const send = (authorization: string | null) =>
      deps.upstream.fetch(module, pathAndQuery, {
        method: request.method,
        headers: forwardHeaders(request, authorization),
        body: hasBody ? (body ?? request.body) : undefined,
        // Node fetch는 스트림 본문에 duplex를 요구한다
        ...(hasBody && multipart ? { duplex: 'half' } : {}),
        signal: request.signal,
        timeoutMs: multipart ? deps.config.timeouts.upload : deps.config.timeouts.upstream,
      })

    let response = await send(auth.authorization)
    if (response.status !== 401 || !auth.usesSession || !replayable) return relay(response)

    // 이 401 응답은 돌려주지 않으니 본문을 읽어 버려도 된다
    const detail = await readProblemDetail(response)
    if (detail === TOKEN_EXPIRED_DETAIL && (await auth.refresh({ staleOnly: true }))) {
      response = await send(auth.authorization)
      if (response.status !== 401) return relay(response)
      await response.body?.cancel()
    }
    await auth.end()
    return relay(await send(null))
  })
}
