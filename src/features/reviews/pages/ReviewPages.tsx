import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ReviewMediaType } from '@/shared/api/types'
import { showToast } from '@/shared/ui'
import { myReview, myReviewTarget, reviewTarget } from '../fixtures'
import { ReviewWriteView } from '../views/ReviewWriteView'
import { useMediaDraft } from './useMediaDraft'

// B-10 리뷰 라우트. 새로 /reviews/new?orderItemId=, 수정 /reviews/:reviewId/edit. 1단계: fixtures.
// TODO(api): 2-5 작성 POST /products/reviews, 수정 PATCH, 삭제 DELETE, 미디어 업로드. 주문 상품 정보는 📝 주문 조회

export function ReviewNewPage() {
  const media = useMediaDraft()
  const [done, setDone] = useState(false)

  return (
    <ReviewWriteView
      mode="create"
      target={reviewTarget}
      media={media.items}
      onAddMedia={media.add}
      onRemoveMedia={media.remove}
      onSubmit={() => setDone(true)}
      completed={done}
    />
  )
}

export function ReviewEditPage() {
  const { reviewId } = useParams()
  const navigate = useNavigate()
  const media = useMediaDraft(
    myReview.media.map((item, i) => ({
      id: `saved${i}`,
      url: item.url,
      kind: item.type === ReviewMediaType.VIDEO ? 'video' : 'image',
    })),
  )
  const [done, setDone] = useState(false)

  return (
    <ReviewWriteView
      key={reviewId}
      mode="edit"
      target={myReviewTarget}
      defaultValues={{ rating: myReview.rating, content: myReview.content }}
      media={media.items}
      onAddMedia={media.add}
      onRemoveMedia={media.remove}
      onSubmit={() => setDone(true)}
      onDelete={() => {
        showToast({ message: '리뷰를 삭제했어요' })
        navigate(`/orders/${myReviewTarget.orderId}`, { replace: true })
      }}
      completed={done}
    />
  )
}
