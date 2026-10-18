import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { myReview, myReviewTarget, reviewTarget } from './fixtures'
import { ReviewWriteView, type ReviewWriteViewProps } from './views/ReviewWriteView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다)

const noop = () => {}

const write = (props: Partial<ReviewWriteViewProps> = {}) => (
  <ReviewWriteView
    mode="create"
    target={reviewTarget}
    media={[]}
    onAddMedia={noop}
    onRemoveMedia={noop}
    onSubmit={noop}
    {...props}
  />
)

const edit = (props: Partial<ReviewWriteViewProps> = {}) =>
  write({
    mode: 'edit',
    target: myReviewTarget,
    defaultValues: { rating: myReview.rating, content: myReview.content },
    media: [
      { id: 'a', url: '', alt: '리뷰 사진 1' },
      { id: 'b', url: '', alt: '리뷰 사진 2' },
    ],
    onDelete: noop,
    ...props,
  })

export const reviewPreviews: ScreenPreview[] = [
  {
    id: 'review-write',
    title: 'B-10 리뷰 쓰기 · 수정 · 삭제',
    layout: 'public',
    path: '/reviews/new',
    states: [
      { id: 'new', label: '새 리뷰 (별점 미선택)', render: () => write() },
      {
        id: 'filled',
        label: '별점 4.5 · 내용 입력',
        render: () =>
          write({
            defaultValues: { rating: 9, content: '달고 시원해요. 아침마다 한 포씩 마시고 있어요.' },
          }),
      },
      {
        id: 'uploading',
        label: '사진·영상 올리는 중',
        render: () =>
          write({
            media: [
              { id: 'a', url: '', alt: '리뷰 사진 1' },
              { id: 'v', url: '', alt: '리뷰 영상', kind: 'video', progress: 62 },
            ],
          }),
      },
      {
        id: 'too-big',
        label: '용량 초과',
        render: () => write({ mediaError: '영상은 30MB 이하로 올려 주세요' }),
      },
      { id: 'edit', label: '수정 (4.5 채움)', render: () => edit() },
      { id: 'delete', label: '삭제 확인', render: () => edit({ defaultDeleteOpen: true }) },
      {
        id: 'failed',
        label: '등록 실패',
        render: () =>
          write({
            defaultValues: {
              rating: 10,
              content: '달고 시원해요. 아침마다 한 포씩 마시고 있어요.',
            },
            errorMessage: '리뷰를 등록하지 못했어요. 잠시 후 다시 시도해 주세요.',
          }),
      },
      { id: 'done', label: '등록 완료', render: () => write({ completed: true }) },
    ],
  },
]
