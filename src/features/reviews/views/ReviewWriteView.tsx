import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Group, Modal, Stack, Text, Textarea, ThemeIcon } from '@mantine/core'
import { CircleCheck, CircleX } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { OrderItemStatus } from '@/shared/api/types'
import { MAX_IMAGE_MB, MAX_VIDEO_MB } from '@/shared/lib/constants'
import { formatAmount } from '@/shared/lib/format'
import { DisabledReason, PageHeader, type PhotoItem, PhotoUploader, StatusBadge } from '@/shared/ui'
import { RatingInput } from '../components/RatingInput'
import { REVIEW_MAX, REVIEW_MEDIA_MAX, type ReviewFormValues, reviewSchema } from '../schemas'
import type { ReviewTarget } from '../types'
import classes from './ReviewWriteView.module.css'

// B-10 리뷰 쓰기 · 수정 · 삭제. 시안: b2c/ReviewWrite, ReviewWriteMobile
// API 기준: 별점 1~10(0.5점 단위), 본문 2,000자 이하, 사진·영상 6개(영상 1개, 30MB) — 시안은 1,000자·사진 3장(A-3).
// 작성자 닉네임은 API에 없어 ‘닉네임과 함께 공개’ 문구를 쓰지 않는다.

/** 그냥 끝나거나 Promise를 돌려준다 (2단계 mutateAsync) */
type MaybeAsync = unknown

export type ReviewWriteViewProps = {
  mode: 'create' | 'edit'
  target: ReviewTarget
  defaultValues?: Partial<ReviewFormValues>
  media: PhotoItem[]
  onAddMedia: (files: File[]) => void
  onRemoveMedia: (id: string) => void
  mediaError?: string | null
  onSubmit: (values: ReviewFormValues) => MaybeAsync
  submitting?: boolean
  errorMessage?: string | null
  /** 수정 화면에서만 */
  onDelete?: () => MaybeAsync
  deleting?: boolean
  /** 등록·수정 끝 */
  completed?: boolean
  /** 삭제 확인을 열어 둔 채로 시작 (미리보기) */
  defaultDeleteOpen?: boolean
}

export function ReviewWriteView({
  mode,
  target,
  defaultValues,
  media,
  onAddMedia,
  onRemoveMedia,
  mediaError,
  onSubmit,
  submitting = false,
  errorMessage,
  onDelete,
  deleting = false,
  completed = false,
  defaultDeleteOpen = false,
}: ReviewWriteViewProps) {
  const [deleteOpen, setDeleteOpen] = useState(defaultDeleteOpen)
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { content: '', ...defaultValues },
  })
  const content = watch('content') ?? ''
  const uploading = media.some((item) => item.progress !== undefined && item.progress < 100)
  const title = mode === 'edit' ? '리뷰 수정' : '리뷰 쓰기'
  const orderPath = `/orders/${target.orderId}`

  return (
    <div className={classes.root}>
      <PageHeader
        title={title}
        backTo={orderPath}
        breadcrumbs={[
          { label: '주문 내역', to: '/orders' },
          { label: '주문 상세', to: orderPath },
          { label: title },
        ]}
      />

      <section className={classes.target} aria-label="리뷰할 상품">
        <div className={classes.thumb} aria-hidden="true">
          {target.thumbnailUrl && <img src={target.thumbnailUrl} alt="" />}
        </div>
        <div className={classes.targetBody}>
          <strong>{target.productName}</strong>
          <span className={`pd-num ${classes.help}`}>
            {target.sellerName} · {target.optionName} · {formatAmount(target.quantity)}개
          </span>
        </div>
        <StatusBadge status={OrderItemStatus.PURCHASE_CONFIRMED} />
      </section>

      {completed ? (
        <section className={`${classes.card} ${classes.done}`} aria-labelledby="review-done">
          <ThemeIcon color="success" variant="light" size={56} radius="50%" aria-hidden="true">
            <CircleCheck size={28} />
          </ThemeIcon>
          <h2 id="review-done" className={classes.doneTitle} role="status">
            {mode === 'edit' ? '리뷰를 고쳤어요' : '리뷰를 등록했어요'}
          </h2>
          <Text c="var(--pd-color-text-secondary)">상품 상세 리뷰에서 볼 수 있어요.</Text>
          <Group gap="xs" justify="center">
            <Button component={Link} to={orderPath} variant="outline">
              주문 상세로
            </Button>
            <Button component={Link} to={`/products/${target.productId}#product-reviews`}>
              상품 보기
            </Button>
          </Group>
        </section>
      ) : (
        <form onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
          <Stack gap="md">
            {errorMessage && (
              <Alert color="error" icon={<CircleX />} role="alert">
                {errorMessage}
              </Alert>
            )}
            <section className={classes.card}>
              <Controller
                control={control}
                name="rating"
                render={({ field }) => (
                  <RatingInput
                    value={field.value ?? null}
                    onChange={field.onChange}
                    error={errors.rating?.message}
                  />
                )}
              />
              <Textarea
                label="어떤 점이 좋았나요?"
                placeholder="맛, 신선도, 크기, 포장 상태를 알려 주시면 다른 분들께 도움이 돼요"
                autosize
                minRows={5}
                maxLength={REVIEW_MAX}
                description={`10자 이상, ${formatAmount(REVIEW_MAX)}자까지 · 지금 ${formatAmount(content.length)}자`}
                error={errors.content?.message}
                {...register('content')}
              />
              <PhotoUploader
                label="사진·영상 (선택)"
                items={media}
                max={REVIEW_MEDIA_MAX}
                maxSizeMb={MAX_IMAGE_MB}
                video={{ maxCount: 1, maxSizeMb: MAX_VIDEO_MB }}
                onAdd={onAddMedia}
                onRemove={onRemoveMedia}
                error={mediaError}
              />
              <Text className={classes.help}>
                리뷰는 상품 상세에 공개돼요. 쓴 리뷰는 나중에 직접 수정하거나 삭제할 수 있어요.
              </Text>
            </section>

            <div className={classes.actions}>
              {mode === 'edit' && onDelete && (
                <Button color="red" variant="outline" onClick={() => setDeleteOpen(true)}>
                  삭제
                </Button>
              )}
              <span className={classes.spacer} />
              <Button component={Link} to={orderPath} variant="outline">
                취소
              </Button>
              <DisabledReason reason={uploading ? '사진·영상을 다 올린 뒤 등록할 수 있어요' : null}>
                <Button type="submit" disabled={uploading} loading={submitting}>
                  {mode === 'edit' ? '수정하기' : '등록하기'}
                </Button>
              </DisabledReason>
            </div>
          </Stack>
        </form>
      )}

      <Modal opened={deleteOpen} onClose={() => setDeleteOpen(false)} title="리뷰를 삭제할까요?">
        <Text>삭제한 리뷰는 되돌릴 수 없어요.</Text>
        <Group justify="flex-end" gap="xs" mt="lg">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            닫기
          </Button>
          <Button color="red" loading={deleting} onClick={() => onDelete?.()}>
            삭제
          </Button>
        </Group>
      </Modal>
    </div>
  )
}
