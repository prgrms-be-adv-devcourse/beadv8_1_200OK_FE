import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { isApiError } from '@/shared/api/ApiError'
import { orderDetailQueryOptions } from '@/shared/api/orderDetail'
import {
  MediaPurpose,
  type OrderDetail,
  OrderItemStatus,
  type ProductReview,
  ReviewMediaType,
} from '@/shared/api/types'
import { QueryState, showToast, useMediaUploads } from '@/shared/ui'
import { reviewErrorMessage, toReviewSubmitErrors } from '../errors'
import {
  useCreateReview,
  useDeleteReview,
  useMyReview,
  useReviewProduct,
  useUpdateReview,
} from '../queries'
import { orderItemFromQuery, targetFromOrder, targetFromReview, withProduct } from '../target'
import type { ReviewOrderItem } from '../types'
import { ReviewWriteView } from '../views/ReviewWriteView'

// B-10 리뷰 라우트. 새로 /reviews/new?orderId=&orderItemId=, 수정 /reviews/:reviewId/edit.
// 작성 POST /products/{productId}/reviews, 수정 PUT /reviews/{reviewId}(첨부 전체 교체), 삭제 DELETE /reviews/{reviewId}.
// 리뷰를 쓸 주문 상품은 ✅ 주문 상세(GET /orders/{orderId})에서 찾고, 구매확정(PURCHASE_CONFIRMED)한 상품만 쓸 수 있다.
// 미디어는 ✅ POST /media/PRODUCT_REVIEW로 고르면 바로 올리고(useMediaUploads), 제출에는 다 올린 urls를 쓴다.
// TODO(api): 수정할 리뷰는 단건 조회가 없어 내 리뷰 목록 GET /reviews/me에서 찾는다(api.ts findMyReview).

function NotFound({ title, description }: { title: string; description: string }) {
  return (
    <QueryState
      status="notFound"
      notFound={{
        title,
        description,
        action: { label: '주문 내역', to: '/orders' },
      }}
    />
  )
}

export function ReviewNewPage() {
  const [params] = useSearchParams()
  const target = useMemo(() => orderItemFromQuery(params), [params])

  if (!target) {
    return (
      <NotFound
        title="리뷰를 쓸 주문 상품을 찾지 못했어요"
        description="주문 상세에서 ‘리뷰 쓰기’를 눌러 주세요."
      />
    )
  }
  return <ReviewFromOrder key={`${target.orderId}-${target.orderItemId}`} {...target} />
}

function ReviewFromOrder({ orderId, orderItemId }: { orderId: number; orderItemId: number }) {
  const order = useQuery(orderDetailQueryOptions(orderId))

  if (order.isPending) return <QueryState status="pending" loadingLabel="주문을 확인하고 있어요" />
  if (order.isError) {
    if (isApiError(order.error) && order.error.status === 404) {
      return (
        <NotFound
          title="주문을 찾지 못했어요"
          description="이미 지워졌거나 내 주문이 아니에요. 주문 내역에서 다시 골라 주세요."
        />
      )
    }
    return (
      <QueryState
        status="error"
        errorMessage={reviewErrorMessage(order.error, 'load')}
        onRetry={() => void order.refetch()}
      />
    )
  }
  return <ReviewFromOrderDetail order={order.data} orderItemId={orderItemId} />
}

function ReviewFromOrderDetail({
  order,
  orderItemId,
}: {
  order: OrderDetail
  orderItemId: number
}) {
  const orderItem = targetFromOrder(order, orderItemId)
  if (!orderItem) {
    return (
      <NotFound
        title="이 주문에서 리뷰를 쓸 상품을 찾지 못했어요"
        description="주문 상세에서 ‘리뷰 쓰기’를 눌러 주세요."
      />
    )
  }
  const status = order.sellerGroups
    .flatMap((group) => group.items)
    .find((item) => item.orderItemId === orderItemId)?.status
  if (status !== OrderItemStatus.PURCHASE_CONFIRMED) {
    return (
      <NotFound
        title="구매확정한 상품만 리뷰를 쓸 수 있어요"
        description="상품을 받고 구매확정한 뒤 다시 와 주세요."
      />
    )
  }
  return <ReviewCreate key={orderItem.orderItemId} orderItem={orderItem} />
}

function ReviewCreate({ orderItem }: { orderItem: ReviewOrderItem }) {
  const product = useReviewProduct(orderItem.productId)
  const media = useMediaUploads(MediaPurpose.PRODUCT_REVIEW)
  const create = useCreateReview()
  const errors = useMemo(() => toReviewSubmitErrors(create.error, 'create'), [create.error])

  if (product.isPending) return <QueryState status="pending" />
  return (
    <ReviewWriteView
      mode="create"
      target={withProduct(orderItem, product.data)}
      media={media.items}
      onAddMedia={(files) => {
        create.reset()
        media.add(files)
      }}
      onRemoveMedia={(id) => {
        create.reset()
        media.remove(id)
      }}
      mediaError={media.error ?? errors.media}
      onSubmit={(values) => {
        if (media.uploading) return
        create.mutate({
          productId: orderItem.productId,
          body: {
            productOptionId: orderItem.productOptionId,
            orderId: orderItem.orderId,
            orderItemId: orderItem.orderItemId,
            rating: values.rating,
            content: values.content,
            mediaUrls: media.urls,
          },
        })
      }}
      submitting={create.isPending}
      serverErrors={errors.fields}
      errorMessage={errors.message}
      completed={create.isSuccess}
    />
  )
}

export function ReviewEditPage() {
  const reviewId = Number(useParams().reviewId)
  const valid = Number.isInteger(reviewId) && reviewId > 0
  const review = useMyReview(reviewId)

  if (!valid || review.data === null) {
    return (
      <QueryState
        status="notFound"
        notFound={{
          title: '리뷰를 찾지 못했어요',
          description: '이미 삭제했거나 내가 쓴 리뷰가 아니에요.',
          action: { label: '주문 내역', to: '/orders' },
        }}
      />
    )
  }
  if (review.isError) {
    return (
      <QueryState
        status="error"
        errorMessage={reviewErrorMessage(review.error, 'load')}
        onRetry={() => void review.refetch()}
      />
    )
  }
  if (review.isPending) return <QueryState status="pending" />
  return <ReviewEdit key={reviewId} review={review.data} />
}

function ReviewEdit({ review }: { review: ProductReview }) {
  const navigate = useNavigate()
  const product = useReviewProduct(review.productId)
  const media = useMediaUploads(
    MediaPurpose.PRODUCT_REVIEW,
    review.media.map((item) => ({
      url: item.url,
      kind: item.type === ReviewMediaType.VIDEO ? 'video' : 'image',
    })),
  )
  const update = useUpdateReview()
  const remove = useDeleteReview()
  const errors = useMemo(() => toReviewSubmitErrors(update.error, 'update'), [update.error])

  if (product.isPending) return <QueryState status="pending" />
  return (
    <ReviewWriteView
      mode="edit"
      target={withProduct(targetFromReview(review), product.data)}
      defaultValues={{ rating: review.rating, content: review.content }}
      media={media.items}
      onAddMedia={(files) => {
        update.reset()
        media.add(files)
      }}
      onRemoveMedia={(id) => {
        update.reset()
        media.remove(id)
      }}
      mediaError={media.error ?? errors.media}
      onSubmit={(values) => {
        if (media.uploading) return
        // 첨부는 보낸 목록으로 전체 교체된다. 지운 사진을 빼고 남은 것 + 새로 올린 것을 화면 순서대로 보낸다
        update.mutate({
          reviewId: review.reviewId,
          body: { rating: values.rating, content: values.content, mediaUrls: media.urls },
        })
      }}
      submitting={update.isPending}
      serverErrors={errors.fields}
      errorMessage={errors.message}
      onDelete={() =>
        remove.mutate(review.reviewId, {
          onSuccess: () => {
            showToast({ message: '리뷰를 삭제했어요' })
            navigate(`/products/${review.productId}#product-reviews`, { replace: true })
          },
        })
      }
      deleting={remove.isPending}
      deleteError={remove.error ? reviewErrorMessage(remove.error, 'delete') : null}
      completed={update.isSuccess}
    />
  )
}
