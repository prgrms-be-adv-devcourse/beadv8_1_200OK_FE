import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { ProductCategory, ProductRegion } from '@/shared/api/types'
import { showToast } from '@/shared/ui'
import { categoryOptions, productCardItems } from '../fixtures'
import { ProductListView } from '../views/ProductListView'

// 상품 목록 라우트 /products?category&region. 필터는 URL searchParams가 기준이다.
// 1단계: fixtures를 걸러 그린다. TODO(api): 2-2 GET /products?category&region&page, 카테고리는 GET /products/categories

const asEnum = <T extends string>(values: Record<string, T>, value: string | null): T | null =>
  value && (Object.values(values) as string[]).includes(value) ? (value as T) : null

export function ProductListPage() {
  const [params, setParams] = useSearchParams()
  const category = asEnum(ProductCategory, params.get('category'))
  const region = asEnum(ProductRegion, params.get('region'))
  const [hideSoldOut, setHideSoldOut] = useState(false)
  const [items, setItems] = useState(productCardItems)

  const matched = items.filter(
    ({ product }) =>
      (!category || product.category === category) && (!region || product.region === region),
  )
  const visible = hideSoldOut ? matched.filter(({ product }) => !product.soldOut) : matched

  const changeRegion = (next: ProductRegion | null) => {
    const nextParams = new URLSearchParams(params)
    if (next) nextParams.set('region', next)
    else nextParams.delete('region')
    setParams(nextParams)
  }

  const toggleLike = (productId: number) => {
    const target = items.find((item) => item.product.productId === productId)
    if (!target) return
    setItems(items.map((item) => (item === target ? { ...item, liked: !item.liked } : item)))
    showToast({ message: target.liked ? '관심 상품에서 뺐어요' : '관심 상품에 담았어요' })
  }

  return (
    <ProductListView
      status="success"
      items={visible}
      totalCount={visible.length}
      categories={categoryOptions}
      category={category}
      region={region}
      onRegionChange={changeRegion}
      hideSoldOut={hideSoldOut}
      onHideSoldOutChange={setHideSoldOut}
      hiddenSoldOutCount={matched.length - visible.length}
      onToggleLike={toggleLike}
    />
  )
}
