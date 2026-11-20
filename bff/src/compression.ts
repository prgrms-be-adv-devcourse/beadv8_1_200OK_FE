import { except } from 'hono/combine'
import { compress } from 'hono/compress'
import { createMiddleware } from 'hono/factory'

const THRESHOLD_BYTES = 1024

// 토큰이 담긴 응답은 압축하지 않는다. 압축 크기로 비밀 값을 추측하는 공격(BREACH) 대비
const NOT_COMPRESSED = ['/api/v1/auth/*', '/bff/session/*']

/**
 * compress는 Content-Length로 임계값을 보는데, 백엔드(Spring)는 작은 응답도 chunked로 보내 길이가 없다.
 * 길이를 모르는 본문은 앞부분을 임계값까지만 읽어 본다. 작으면 길이를 붙여 압축을 건너뛰게 하고,
 * 크면 읽은 부분을 앞에 다시 붙여 스트리밍 그대로 넘긴다
 */
const measureSmallBody = createMiddleware(async (c, next) => {
  await next()
  const body = c.res.body
  if (!body || c.res.headers.has('Content-Length')) return

  const reader = body.getReader()
  const head: Uint8Array[] = []
  let size = 0
  let done = false
  while (size < THRESHOLD_BYTES) {
    const chunk = await reader.read()
    if (chunk.done) {
      done = true
      break
    }
    head.push(chunk.value)
    size += chunk.value.byteLength
  }

  if (done) {
    const headers = new Headers(c.res.headers)
    headers.set('Content-Length', String(size))
    c.res = new Response(Buffer.concat(head), { status: c.res.status, headers })
    return
  }
  const rest = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of head) controller.enqueue(chunk)
    },
    async pull(controller) {
      const chunk = await reader.read()
      if (chunk.done) controller.close()
      else controller.enqueue(chunk.value)
    },
    cancel: (reason) => reader.cancel(reason),
  })
  c.res = new Response(rest, c.res)
})

/** Accept-Encoding에 따라 1KB 이상 응답을 gzip·deflate로 압축한다. nginx에 gzip이 없어 BFF가 한다 */
export function responseCompression() {
  return except(NOT_COMPRESSED, compress({ threshold: THRESHOLD_BYTES }), measureSmallBody)
}
