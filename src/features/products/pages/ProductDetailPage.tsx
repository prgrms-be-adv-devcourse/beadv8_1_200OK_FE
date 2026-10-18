import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { showToast } from '@/shared/ui'
import { appleReviews, MY_MEMBER_ID, productDetailOf, sellerOfProduct } from '../fixtures'
import { ProductDetailView } from '../views/ProductDetailView'

// B-02 상품 상세 라우트 /products/:productId. 1단계: fixtures로 그린다.
// TODO(api): 2-2 상세·리뷰 목록, 2-3 담기(features/cart 공개 hook). 판매자·관심·팔로우는 API가 없어 fixtures 유지.

export function ProductDetailPage() {
  const { productId } = useParams()
  const id = Number(productId)
  const product = productDetailOf(id)
  const seller = sellerOfProduct(id)
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [following, setFollowing] = useState(false)

  return (
    <ProductDetailView
      key={id}
      status={product ? 'success' : 'notFound'}
      product={product}
      seller={seller}
      liked={liked}
      following={following}
      reviews={id === 101 ? appleReviews : []}
      hasMoreReviews={id === 101}
      currentMemberId={MY_MEMBER_ID}
      onAddToCart={() =>
        showToast({
          message: '장바구니에 담았어요',
          action: { label: '장바구니 보기', onClick: () => navigate('/cart') },
        })
      }
      onToggleLike={() => {
        setLiked(!liked)
        showToast({ message: liked ? '관심 상품에서 뺐어요' : '관심 상품에 담았어요' })
      }}
      onToggleFollow={() => {
        setFollowing(!following)
        showToast({
          message: following ? '팔로우를 취소했어요' : `${seller?.storeName}을 팔로우했어요`,
        })
      }}
    />
  )
}
