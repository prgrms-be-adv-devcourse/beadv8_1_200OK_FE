// TODO(api): 장바구니 조회에 productId가 없어 옵션별 상품 상세를 부를 수 없다(bruno README 6).
// 이 브라우저에서 담을 때 옵션 → 상품 번호를 localStorage에 적어 두고 장바구니에서 찾는다.
// 상품 번호는 공개 정보라 회원별로 나누지 않는다. 조회에 상품 정보가 생기면 이 파일을 지운다.

const STORAGE_KEY = 'paldo.cart.optionProducts'

function read(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const map: unknown = raw ? JSON.parse(raw) : {}
    return typeof map === 'object' && map !== null ? (map as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function productIdOfOption(optionId: number): number | null {
  const productId = read()[optionId]
  return typeof productId === 'number' ? productId : null
}

export function rememberOptionProduct(optionId: number, productId: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), [optionId]: productId }))
  } catch {
    // 저장소를 못 쓰면 상품 상세 캐시로만 찾는다
  }
}
