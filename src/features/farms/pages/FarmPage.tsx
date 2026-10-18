import { useState } from 'react'
import { useParams } from 'react-router'
import { showToast } from '@/shared/ui'
import { farmProducts, farmSellers, MY_SELLER_ID } from '../fixtures'
import { FarmStoreView } from '../views/FarmStoreView'

// B-11 판매자 상점 라우트 /farms/:farmId. 1단계: fixtures로 그린다.
// TODO(api): 📝 GET /sellers/{sellerId}, 팔로우 PUT/DELETE /members/me/followings/{sellerId}. 판매자별 상품 목록은 API 없음

export function FarmPage() {
  const { farmId } = useParams()
  const id = Number(farmId)
  const seller = farmSellers.find((s) => s.sellerId === id)
  const [following, setFollowing] = useState(false)
  const [products, setProducts] = useState(farmProducts[id] ?? [])

  return (
    <FarmStoreView
      status={seller ? 'success' : 'notFound'}
      seller={seller}
      following={following}
      isOwner={id === MY_SELLER_ID}
      products={products}
      onToggleFollow={() => {
        setFollowing(!following)
        showToast({
          message: following ? '팔로우를 취소했어요' : `${seller?.storeName}을 팔로우했어요`,
        })
      }}
      onToggleLike={(productId) => {
        const target = products.find((item) => item.product.productId === productId)
        if (!target) return
        setProducts(
          products.map((item) => (item === target ? { ...item, liked: !item.liked } : item)),
        )
        showToast({ message: target.liked ? '관심 상품에서 뺐어요' : '관심 상품에 담았어요' })
      }}
    />
  )
}
