import type {
  ProductCategory,
  ProductRegion,
  ProductStatus,
  ProductUpdateRequest,
  ProductVisibility,
} from '@/shared/api/types'

// TODO(api): 판매자 상품 목록 API는 생겼다(GET /sellers/me/products). 상세(version · 옵션 재고 · 옵션 id) API는 아직 없어
// 수정 화면용으로만 남긴다. 이 브라우저에서 등록·수정한 상품을 회원별로 localStorage에 적어 두고 수정 화면의 처음 값으로 쓴다.
// 목록에서 여기 없는 상품은 ‘수정’을 막는다(이 기기에서 등록하거나 고친 상품만 수정 가능).
// version은 서버 규칙대로 센다: 등록 0, 수정(PUT) 성공마다 +1, 상태·노출 PATCH 성공마다 +PATCH_VERSION_STEP.
// 상세 API가 생기면 이 파일을 지우고 상세 쿼리로 바꾼다.

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

/**
 * PATCH /products/{id}/status · /visibility 가 성공하면 서버 version이 오르는 폭.
 * 2026-10-18 로컬 서버 관측값(2). dev 서버에서 SELLER 토큰으로 재확인 필요 — 2026-10-20 검증 때는 SELLER 계정이 없어 다시 재지 못했다.
 */
export const PATCH_VERSION_STEP = 2

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

/** 상태·노출·version만 바꾼다. 없는 상품이면 아무것도 하지 않는다 */
export function patchCachedProduct(
  memberId: number,
  productId: number,
  patch: Partial<Pick<CachedProduct, 'status' | 'visibility' | 'version'>>,
) {
  const list = readCachedProducts(memberId)
  if (!list.some((p) => p.productId === productId)) return
  write(
    memberId,
    list.map((p) => (p.productId === productId ? { ...p, ...patch } : p)),
  )
}

export function removeCachedProduct(memberId: number, productId: number) {
  write(
    memberId,
    readCachedProducts(memberId).filter((p) => p.productId !== productId),
  )
}

export function isCachedProduct(memberId: number, productId: number): boolean {
  return readCachedProducts(memberId).some((p) => p.productId === productId)
}
