import { relay, type Upstream } from './upstream.ts'

// 상품 상세(GET /api/v1/products/{id}) 응답을 BFF 메모리에 짧게(기본 5초) 둔다 (ADR-0011).
// 한 상품에 요청이 몰려도 백엔드 DB 커넥션을 덜 쓰게 하려는 예방책이다. 측정된 문제는 아직 없다.
// - 같은 상품을 동시에 부르면 백엔드에는 한 번만 보낸다(single-flight). 캐시가 끝나는 순간 몰린 요청도 1번이 된다
// - 캐시를 채울 때는 토큰 없이 부른다. 상세는 공개 조회이고 사용자별 필드가 없다.
//   숨김·삭제 상품은 주인 판매자 토큰으로도 404라서(로컬 백엔드 확인 2026-11-20) 200은 모두 같은 공개 응답이다.
//   상세에 사용자별 필드(관심 여부 등)가 생기면 이 캐시를 다시 봐야 한다
// - 200만 담는다. 404·5xx·연결 실패는 담지 않는다
// - 상품 수와 본문 합계(바이트)에 상한을 두고, 넘으면 가장 오래 안 쓴 상품부터 버린다(LRU)
// - BFF를 지나는 판매자 수정·상태·노출 변경·삭제가 성공하면 그 상품을 지운다(proxy.ts).
//   BFF가 모르는 변경(주문으로 품절, 리뷰 수, 관리자·배치)은 TTL이 끝나면 반영된다
// - BFF가 한 대라 메모리로 충분하다. 여러 대가 되면 대수만큼 백엔드를 부를 뿐 틀린 값은 TTL을 넘지 않는다

export type CacheStatus = 'HIT' | 'MISS'

type Snapshot = { status: number; headers: [string, string][]; body: ArrayBuffer }
type Entry = { snapshot: Snapshot; expiresAt: number; bytes: number }
export type CachedProduct = { snapshot: Snapshot; cache: CacheStatus }

// 쿼리가 붙은 상세나 0으로 시작하는 번호는 캐시하지 않고 프록시가 그대로 넘긴다
const DETAIL_PATH = /^\/api\/v1\/products\/([1-9]\d{0,15})$/
const CHANGE_PATH = /^\/api\/v1\/products\/([1-9]\d{0,15})(?:\/(?:status|visibility))?$/

const idOf = (match: RegExpExecArray | null) => {
  const id = match?.[1] === undefined ? Number.NaN : Number(match[1])
  return Number.isSafeInteger(id) ? id : null
}

/** 캐시로 답할 상세 요청이면 상품 번호. GET만, 쿼리 없이 */
export function cachedProductId(method: string, url: URL): number | null {
  if (method !== 'GET' || url.search) return null
  return idOf(DETAIL_PATH.exec(url.pathname))
}

/** 상세를 바꾸는 판매자 요청(수정·삭제·상태·노출 변경)이면 상품 번호 */
export function changedProductId(method: string, path: string): number | null {
  if (method === 'GET' || method === 'HEAD') return null
  return idOf(CHANGE_PATH.exec(path))
}

export class ProductDetailCache {
  readonly #upstream: Upstream
  readonly #timeoutMs: number
  readonly #ttlMs: number
  readonly #maxEntries: number
  readonly #maxBytes: number
  readonly #now: () => number
  // Map은 넣은 순서를 지킨다. 읽을 때 뒤로 옮겨 맨 앞이 가장 오래 안 쓴 항목(LRU)이 되게 한다
  readonly #entries = new Map<number, Entry>()
  readonly #inflight = new Map<number, Promise<Snapshot>>()
  #bytes = 0

  constructor(deps: {
    upstream: Upstream
    timeoutMs: number
    ttlMs: number
    maxEntries: number
    maxBytes: number
    now: () => number
  }) {
    this.#upstream = deps.upstream
    this.#timeoutMs = deps.timeoutMs
    this.#ttlMs = deps.ttlMs
    this.#maxEntries = deps.maxEntries
    this.#maxBytes = deps.maxBytes
    this.#now = deps.now
  }

  /**
   * 담아 둔 응답이 있으면 HIT. 없으면 백엔드를 부르고 MISS.
   * 이미 누가 부르는 중이면 그 결과를 같이 받는다(직접 부르지 않았으니 HIT)
   */
  async get(productId: number): Promise<CachedProduct> {
    const entry = this.#entries.get(productId)
    if (entry && entry.expiresAt > this.#now()) {
      this.#entries.delete(productId)
      this.#entries.set(productId, entry)
      return { snapshot: entry.snapshot, cache: 'HIT' }
    }

    const pending = this.#inflight.get(productId)
    if (pending) return { snapshot: await pending, cache: 'HIT' }

    const flight = this.#load(productId)
    this.#inflight.set(productId, flight)
    try {
      const snapshot = await flight
      // 부르는 사이 판매자가 바꿨으면(invalidate) 바뀌기 전 값일 수 있어 담지 않는다
      if (this.#inflight.get(productId) === flight && snapshot.status === 200) {
        this.#store(productId, snapshot)
      }
      return { snapshot, cache: 'MISS' }
    } finally {
      if (this.#inflight.get(productId) === flight) this.#inflight.delete(productId)
    }
  }

  /** 판매자가 상품을 바꾼 뒤 부른다. 다음 요청은 백엔드에서 새로 받는다 */
  invalidate(productId: number): void {
    this.#remove(productId)
    this.#inflight.delete(productId)
  }

  #remove(productId: number): void {
    const entry = this.#entries.get(productId)
    if (!entry) return
    this.#bytes -= entry.bytes
    this.#entries.delete(productId)
  }

  #store(productId: number, snapshot: Snapshot): void {
    const bytes = snapshot.body.byteLength
    if (this.#ttlMs <= 0 || bytes > this.#maxBytes) return
    const now = this.#now()
    // 앞쪽(오래 안 쓴 쪽)의 만료된 항목을 먼저 치운다
    for (const [key, entry] of this.#entries) {
      if (entry.expiresAt > now) break
      this.#remove(key)
    }
    this.#remove(productId)
    this.#entries.set(productId, { snapshot, expiresAt: now + this.#ttlMs, bytes })
    this.#bytes += bytes
    for (const key of this.#entries.keys()) {
      if (this.#entries.size <= this.#maxEntries && this.#bytes <= this.#maxBytes) break
      this.#remove(key)
    }
  }

  // 여러 요청이 나눠 받으므로 먼저 온 브라우저의 signal을 넘기지 않는다. 그 브라우저가 끊어도 나머지는 받는다
  async #load(productId: number): Promise<Snapshot> {
    const response = relay(
      await this.#upstream.fetch('product', `/api/v1/products/${productId}`, {
        headers: { Accept: 'application/json, application/problem+json' },
        timeoutMs: this.#timeoutMs,
      }),
    )
    const headers: [string, string][] = []
    response.headers.forEach((value, key) => {
      // 여러 사람에게 나눠 주는 응답이라 쿠키는 싣지 않는다
      if (key !== 'set-cookie') headers.push([key, value])
    })
    return { status: response.status, headers, body: await response.arrayBuffer() }
  }
}

/** 백엔드 응답의 상태·헤더·본문 그대로에 X-Cache만 더한다. Cache-Control 등 헤더는 바꾸지 않는다 */
export function cachedResponse({ snapshot, cache }: CachedProduct): Response {
  const headers = new Headers(snapshot.headers)
  headers.set('X-Cache', cache)
  return new Response(snapshot.body.byteLength ? snapshot.body : null, {
    status: snapshot.status,
    headers,
  })
}

/** 상세 화면 합치기용. 2xx면 본문 JSON, 아니면 null */
export function productJson({ snapshot }: CachedProduct): unknown {
  if (snapshot.status < 200 || snapshot.status >= 300) return null
  return JSON.parse(new TextDecoder().decode(snapshot.body))
}
