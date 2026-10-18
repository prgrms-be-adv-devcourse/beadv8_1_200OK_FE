import type {
  ProductCategory,
  ProductRegion,
  ProductStatus,
  ProductUpdateRequest,
  ProductVisibility,
} from '@/shared/api/types'

// TODO(api): 판매자 본인 상품 목록·상세(version · 재고 · 노출 포함) API가 없다(PLAN 2-6, bruno README 6).
// 이 브라우저에서 등록·수정한 상품을 회원별로 localStorage에 적어 두고, 상품 관리 목록과 수정 화면의 처음 값으로 쓴다.
// version은 서버 규칙대로 센다: 등록 0, 수정(PUT) 성공마다 +1 (2026-10-18 로컬 서버 확인).
// API가 생기면 이 파일을 지우고 목록·상세 쿼리로 바꾼다.

export type CachedProduct = {
  productId: number
  version: number
  name: string
  descriptionHtml: string
  category: ProductCategory
  region: ProductRegion
  status: ProductStatus
  visibility: ProductVisibility
  imageUrls: string[]
  /** id는 상세 조회(공개 상품만)로 알게 된 옵션만 있다 */
  options: ProductUpdateRequest['options']
  /** 이 브라우저에서 마지막으로 저장한 시각 */
  updatedAt: string
}

const keyOf = (memberId: number) => `paldo.seller.products.${memberId}`

export function readCachedProducts(memberId: number): CachedProduct[] {
  try {
    const raw = localStorage.getItem(keyOf(memberId))
    const list: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? (list as CachedProduct[]) : []
  } catch {
    return []
  }
}

function write(memberId: number, list: CachedProduct[]) {
  try {
    localStorage.setItem(keyOf(memberId), JSON.stringify(list))
  } catch {
    // 저장소를 못 쓰면(사생활 보호 모드 등) 목록에 남지 않을 뿐 등록·수정은 이미 끝났다
  }
}

/** 새 상품은 맨 앞에, 있던 상품은 그 자리에서 바꾼다 */
export function saveCachedProduct(memberId: number, product: CachedProduct) {
  const list = readCachedProducts(memberId)
  const exists = list.some((p) => p.productId === product.productId)
  write(
    memberId,
    exists
      ? list.map((p) => (p.productId === product.productId ? product : p))
      : [product, ...list],
  )
}

export function removeCachedProduct(memberId: number, productId: number) {
  write(
    memberId,
    readCachedProducts(memberId).filter((p) => p.productId !== productId),
  )
}
