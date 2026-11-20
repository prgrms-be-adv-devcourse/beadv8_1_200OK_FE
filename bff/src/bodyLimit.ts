import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'
import { problem, problemDetail } from './problem.ts'

/** 업로드 본문인지. proxy.ts가 담을지 흘려보낼지도 이걸로 정해서, 제한을 비껴가는 틈이 없게 한다 */
export function isMultipart(request: Request): boolean {
  return request.headers.get('content-type')?.startsWith('multipart/') ?? false
}

// proxy.ts는 multipart가 아닌 본문을 메모리에 통째로 담는다. nginx 상한(32m)까지 받지 않도록 여기서 끊는다.
// Content-Length가 있으면 본문을 읽지 않고 거절하고, chunked는 상한까지만 읽고 거절한다.
// 업로드(최대 30MB)는 담지 않고 흘려보내므로 대상이 아니다
export function requestBodyLimit(maxBytes: number) {
  const limit = bodyLimit({
    maxSize: maxBytes,
    onError: (c) => problem(413, problemDetail.payloadTooLarge, c.req.path),
  })
  return createMiddleware((c, next) => (isMultipart(c.req.raw) ? next() : limit(c, next)))
}
