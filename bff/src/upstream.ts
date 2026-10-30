import type { Config, UpstreamModule } from './config.ts'

// 경로 접두어 → 백엔드 모듈. 백엔드 컨트롤러의 @RequestMapping과 같이 맞춘다(origin/dev 2026-10-27).
// 긴 접두어부터 본다. 공개 계약 /api/v1만 다루고 /internal은 부르지 않는다 (ADR-0006)
const routes: [prefix: string, module: UpstreamModule][] = [
  ['/api/v1/admin/seller-applications', 'member'],
  ['/api/v1/admin/postal-regions', 'delivery'],
  ['/api/v1/admin/payouts', 'payout'],
  ['/api/v1/sellers/me/applications', 'member'],
  ['/api/v1/sellers/me/profile', 'member'],
  ['/api/v1/sellers/me/products', 'product'],
  ['/api/v1/seller/shipments', 'delivery'],
  ['/api/v1/auth', 'member'],
  ['/api/v1/members', 'member'],
  ['/api/v1/products', 'product'],
  ['/api/v1/reviews', 'product'],
  ['/api/v1/cart', 'order'],
  ['/api/v1/orders', 'order'],
  ['/api/v1/shipments', 'delivery'],
  ['/api/v1/wallets', 'wallet'],
  ['/api/v1/payouts', 'payout'],
  ['/api/v1/media', 'media'],
]

export const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]
// fetch가 압축을 풀어서 주므로 원래 content-encoding·length를 그대로 두면 브라우저가 본문을 못 읽는다
const DROP_RESPONSE = new Set([...HOP_BY_HOP, 'content-encoding', 'content-length'])

/** 백엔드 응답을 상태·본문 그대로 브라우저에 돌려준다 */
export function relay(upstream: Response): Response {
  const headers = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!DROP_RESPONSE.has(key)) headers.append(key, value)
  })
  return new Response(upstream.body, { status: upstream.status, headers })
}

const matches = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)

/** 표에 없는 경로는 null. BACKEND_URL로 보내고 백엔드가 404를 판단한다 */
export function moduleForPath(path: string): UpstreamModule | null {
  return routes.find(([prefix]) => matches(path, prefix))?.[1] ?? null
}

export class UpstreamError extends Error {
  readonly kind: 'timeout' | 'unreachable'
  constructor(kind: 'timeout' | 'unreachable', cause: unknown) {
    super(`upstream ${kind}`, { cause })
    this.name = 'UpstreamError'
    this.kind = kind
  }
}

type FetchInit = RequestInit & { timeoutMs: number }

export type JsonResult<T> = { ok: true; data: T } | { ok: false; response: Response }

export class Upstream {
  readonly #config: Config

  constructor(config: Config) {
    this.#config = config
  }

  url(module: UpstreamModule | null, pathAndQuery: string): string {
    const origin = module ? this.#config.upstreams[module] : this.#config.backendUrl
    return `${origin}${pathAndQuery}`
  }

  /** 응답을 받으면 상태와 상관없이 돌려준다. 연결 실패·시간 초과만 UpstreamError로 던진다 */
  async fetch(
    module: UpstreamModule | null,
    pathAndQuery: string,
    init: FetchInit,
  ): Promise<Response> {
    const { timeoutMs, signal, ...rest } = init
    const timeout = AbortSignal.timeout(timeoutMs)
    try {
      return await fetch(this.url(module, pathAndQuery), {
        ...rest,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      })
    } catch (error) {
      // 브라우저가 먼저 끊은 요청은 그대로 던진다. 응답을 받을 쪽이 없다
      if (signal?.aborted) throw error
      throw new UpstreamError(timeout.aborted ? 'timeout' : 'unreachable', error)
    }
  }

  async getJson<T>(
    module: UpstreamModule,
    pathAndQuery: string,
    options: { authorization: string | null; timeoutMs: number; signal?: AbortSignal },
  ): Promise<JsonResult<T>> {
    const headers = new Headers({ Accept: 'application/json, application/problem+json' })
    if (options.authorization) headers.set('Authorization', options.authorization)
    const response = await this.fetch(module, pathAndQuery, {
      headers,
      timeoutMs: options.timeoutMs,
      signal: options.signal,
    })
    if (!response.ok) return { ok: false, response }
    return { ok: true, data: (await response.json()) as T }
  }
}
