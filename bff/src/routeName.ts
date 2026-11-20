// 요청을 경로별로 묶는 이름(`GET /api/v1/products/:id`). 프록시가 /api/v1/* 하나라 라우트 패턴으로는
// 나눌 수 없어서 실제 경로를 정규화한다(이슈 #48 Sentry 트랜잭션 이름, #49 백엔드 5xx 보고).
// - 숫자 구간은 :id, 충전 번호(/wallets/me/charges/{chargeNo})는 :chargeNo. 그 자리의 confirm·fail은 고정 경로라 그대로 둔다
// - 쿼리·해시와 끝 슬래시는 뺀다
// - 그 밖의 구간(me, enum인 PRODUCT_IMAGE 등)은 그대로 둔다
const NUMERIC = /^\d+$/
const CHARGES_PREFIX = ['wallets', 'me', 'charges'] as const
const CHARGE_ACTIONS = new Set(['confirm', 'fail'])

export function routeName(method: string, pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] ?? ''
  const segments = path.split('/').filter(Boolean)
  const normalized = segments.map((segment, index) => {
    if (NUMERIC.test(segment)) return ':id'
    if (isChargeNo(segments, index)) return ':chargeNo'
    return segment
  })
  return `${method.toUpperCase()} /${normalized.join('/')}`
}

function isChargeNo(segments: string[], index: number): boolean {
  return (
    index >= CHARGES_PREFIX.length &&
    !CHARGE_ACTIONS.has(segments[index] ?? '') &&
    CHARGES_PREFIX.every(
      (expected, offset) => segments[index - CHARGES_PREFIX.length + offset] === expected,
    )
  )
}
