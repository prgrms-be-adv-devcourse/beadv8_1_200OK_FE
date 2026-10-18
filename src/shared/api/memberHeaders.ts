import type { InternalAxiosRequestConfig } from 'axios'
import type { AuthSession } from './authToken'

// 임시 헤더 어댑터 (PLAN 2-0의 0-3). 판매자 상품 쓰기와 정산 API는 아직 토큰이 아니라
// X-Member-Id · X-Member-Role로 회원을 받는다(bruno README). 값은 로그인 토큰에서 읽는다.
// TODO(api): 서버가 토큰 방식으로 바뀌면 이 파일과 client.ts의 attachMemberHeaders 호출을 지운다.

type Rule = { methods?: string[]; pattern: RegExp }

const rules: Rule[] = [
  // 상품 등록 · 수정 · 삭제 · 판매 상태 · 노출 (리뷰 작성 POST /products/{id}/reviews는 Bearer라 제외)
  { methods: ['post'], pattern: /^\/api\/v1\/products$/ },
  { methods: ['put', 'delete'], pattern: /^\/api\/v1\/products\/\d+$/ },
  { methods: ['patch'], pattern: /^\/api\/v1\/products\/\d+\/(status|visibility)$/ },
  // 정산 목록 · 상세 · 항목
  { pattern: /^\/api\/v1\/payouts(\/|$)/ },
]

function pathOf(url: string): string {
  const path = url.replace(/^[a-z]+:\/\/[^/]+/i, '')
  return path.split('?')[0] ?? path
}

export function needsMemberHeaders(method: string | undefined, url: string | undefined): boolean {
  if (!url) return false
  const path = pathOf(url)
  const verb = (method ?? 'get').toLowerCase()
  return rules.some(
    (rule) => (!rule.methods || rule.methods.includes(verb)) && rule.pattern.test(path),
  )
}

export function attachMemberHeaders(
  config: InternalAxiosRequestConfig,
  session: AuthSession | null,
) {
  if (!session || !needsMemberHeaders(config.method, config.url)) return
  config.headers.set('X-Member-Id', String(session.memberId))
  config.headers.set('X-Member-Role', session.role)
}
