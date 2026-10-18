import { useState } from 'react'
import { showToast } from '@/shared/ui'

// TODO(api): 관심 상품 API가 없어(📝 wishlist 조회·등록·삭제) 화면 안에서만 켜고 끈다

export function useLocalLikes() {
  const [likedIds, setLikedIds] = useState<ReadonlySet<number>>(() => new Set())

  const toggleLike = (productId: number) => {
    const liked = likedIds.has(productId)
    const next = new Set(likedIds)
    if (liked) next.delete(productId)
    else next.add(productId)
    setLikedIds(next)
    showToast({ message: liked ? '관심 상품에서 뺐어요' : '관심 상품에 담았어요' })
  }

  return { isLiked: (productId: number) => likedIds.has(productId), toggleLike }
}
