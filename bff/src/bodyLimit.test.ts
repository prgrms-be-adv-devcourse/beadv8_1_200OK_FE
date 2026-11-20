import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { BACKEND, setup } from './test/fakeBackend.ts'
import { server } from './test/server.ts'

const LIMIT = 2 * 1024 * 1024
const json = { 'Content-Type': 'application/json' }

/** 백엔드에 닿은 본문 크기. 닿지 않으면 null */
function captureBody(method: 'post' | 'put', path: string) {
  const seen: { body: string | null } = { body: null }
  server.use(
    http[method](`${BACKEND}${path}`, async ({ request }) => {
      seen.body = await request.text()
      return HttpResponse.json({ ok: true }, { status: 201 })
    }),
  )
  return seen
}

describe('요청 본문 상한', () => {
  it('C1: 1KB JSON은 그대로 백엔드에 넘긴다', async () => {
    const { request } = setup()
    const seen = captureBody('post', '/api/v1/cart/items')
    const body = JSON.stringify({ productOptionId: 3, quantity: 1, memo: 'a'.repeat(1000) })

    const response = await request('/api/v1/cart/items', { method: 'POST', headers: json, body })

    expect(response.status).toBe(201)
    expect(seen.body).toBe(body)
  })

  it('C2: 상세설명 200,000자(한글) 상품 저장은 통과한다 — 백엔드 @Size(max = 200_000)의 정상 최대치', async () => {
    const { request } = setup()
    const seen = captureBody('post', '/api/v1/sellers/me/products')
    // 따옴표는 JSON에서 이스케이프돼 더 길어진다
    const descriptionHtml = `<p class="x">${'가'.repeat(200_000 - 20)}</p>`
    const body = JSON.stringify({ name: '청송 사과', descriptionHtml })
    const bytes = new TextEncoder().encode(body).byteLength

    const response = await request('/api/v1/sellers/me/products', {
      method: 'POST',
      headers: { ...json, 'Content-Length': String(bytes) },
      body,
    })

    expect(bytes).toBeGreaterThan(590_000)
    expect(response.status).toBe(201)
    expect(seen.body).toBe(body)
  })

  it('C3: 상한을 넘는 JSON은 413 problem+json을 주고 백엔드를 부르지 않는다', async () => {
    const { request } = setup()
    const seen = captureBody('post', '/api/v1/sellers/me/products')
    const body = JSON.stringify({ descriptionHtml: 'a'.repeat(LIMIT) })

    const response = await request('/api/v1/sellers/me/products', {
      method: 'POST',
      headers: { ...json, 'Content-Length': String(body.length) },
      body,
    })

    expect(response.status).toBe(413)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({
      status: 413,
      detail: '보낸 내용이 너무 커요. 내용을 줄인 뒤 다시 시도해 주세요',
    })
    expect(seen.body).toBeNull()
  })

  it('C4: 30MB multipart 업로드는 상한 대상이 아니고 그대로 흘려보낸다', async () => {
    const { request } = setup()
    let size = 0
    server.use(
      http.post(`${BACKEND}/api/v1/media`, async ({ request }) => {
        size = (await request.arrayBuffer()).byteLength
        return HttpResponse.json({ mediaId: 1 }, { status: 201 })
      }),
    )
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(30 * 1024 * 1024)]), 'x.jpg')

    const response = await request('/api/v1/media', { method: 'POST', body: form })

    expect(response.status).toBe(201)
    expect(size).toBeGreaterThan(30 * 1024 * 1024)
  })

  it('C5: Content-Length 없는 chunked 본문은 상한에서 끊고 나머지는 읽지 않는다', async () => {
    const { request } = setup()
    const seen = captureBody('post', '/api/v1/sellers/me/products')
    const chunk = new Uint8Array(64 * 1024).fill(97)
    const total = 10 * 1024 * 1024
    let pulled = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulled >= total) return controller.close()
        pulled += chunk.byteLength
        controller.enqueue(chunk)
      },
    })

    const response = await request('/api/v1/sellers/me/products', {
      method: 'POST',
      headers: json,
      body,
      duplex: 'half',
    } as RequestInit)

    expect(response.status).toBe(413)
    expect(seen.body).toBeNull()
    // 스트림은 소비자보다 한 조각쯤 앞서 읽어 둘 수 있다
    expect(pulled).toBeLessThanOrEqual(LIMIT + chunk.byteLength * 2)
  })

  it('상한은 env로 바꾼다', async () => {
    const { createApp } = await import('./app.ts')
    const { loadConfig } = await import('./config.ts')
    const app = createApp({
      config: loadConfig({
        NODE_ENV: 'test',
        BACKEND_URL: BACKEND,
        REQUEST_BODY_LIMIT_BYTES: '10',
      }),
    })

    const response = await app.request('http://localhost:8787/api/v1/cart/items', {
      method: 'POST',
      headers: { ...json, 'Content-Length': '11' },
      body: '{"a":"123"}',
    })

    expect(response.status).toBe(413)
  })
})
