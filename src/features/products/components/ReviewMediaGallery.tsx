import { ActionIcon, Modal } from '@mantine/core'
import { useHotkeys } from '@mantine/hooks'
import { ChevronLeft, ChevronRight, Image as ImageIcon, Play } from 'lucide-react'
import { useState } from 'react'
import { type ProductReview, ReviewMediaType } from '@/shared/api/types'
import classes from './ReviewMediaGallery.module.css'

// 리뷰 첨부: 썸네일 72(사진·영상 같은 크기, 영상은 첫 장면 + 재생 아이콘) → 누르면 모달에서 크게 본다.
// 모달은 사진을 화면에 맞춰 보이고 영상은 컨트롤과 함께 재생한다. 이전·다음 버튼, 아래 썸네일, ←·→ 키로 넘긴다.
// 주소가 없는 첨부는 누를 수 없는 자리표시로 둔다.

type Media = ProductReview['media'][number]

const isVideo = (item: Media) => item.type === ReviewMediaType.VIDEO
const labelOf = (item: Media, i: number) => `${isVideo(item) ? '리뷰 영상' : '리뷰 사진'} ${i + 1}`

function Thumb({ item }: { item: Media }) {
  return isVideo(item) ? (
    <>
      <video src={item.url} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" />
      <span className={classes.playBadge} aria-hidden="true">
        <Play size={16} />
      </span>
    </>
  ) : (
    <img src={item.url} alt="" />
  )
}

export function ReviewMediaGallery({ media }: { media: ProductReview['media'] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const viewable = media.filter((item) => item.url)
  const current = openIndex === null ? undefined : media[openIndex]

  // 모달 안에서는 주소가 있는 첨부만 오간다
  const viewablePosition = current ? viewable.indexOf(current) : -1
  const move = (step: number) => {
    const target = viewable[viewablePosition + step]
    if (target) setOpenIndex(media.indexOf(target))
  }
  useHotkeys(
    openIndex === null
      ? []
      : [
          ['ArrowLeft', () => move(-1)],
          ['ArrowRight', () => move(1)],
        ],
  )

  if (media.length === 0) return null
  return (
    <>
      <ul className={classes.thumbs} aria-label="첨부">
        {media.map((item, i) => {
          const label = labelOf(item, i)
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: 첨부는 순서로 구분한다
            <li key={i} className={classes.thumbItem}>
              {item.url ? (
                <button
                  type="button"
                  className={classes.thumbButton}
                  aria-label={`${label} 크게 보기`}
                  onClick={() => setOpenIndex(i)}
                >
                  <Thumb item={item} />
                </button>
              ) : (
                <span role="img" aria-label={label} className={classes.placeholder}>
                  {isVideo(item) ? (
                    <Play size={20} aria-hidden="true" />
                  ) : (
                    <ImageIcon size={20} aria-hidden="true" />
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <Modal
        opened={current !== undefined}
        onClose={() => setOpenIndex(null)}
        title={`리뷰 사진·영상 ${viewablePosition + 1} / ${viewable.length}`}
        size="xl"
        // 크게 보는 창이라 아래 닫기 버튼 대신 위의 닫기(X)를 쓴다(테마 기본은 숨김, 44px·'닫기')
        withCloseButton
      >
        {current && openIndex !== null && (
          <div className={classes.viewer}>
            <div className={classes.stage}>
              {isVideo(current) ? (
                // biome-ignore lint/a11y/useMediaCaption: 구매자가 올린 리뷰 영상이라 자막이 없다
                <video
                  key={openIndex}
                  src={current.url}
                  aria-label={labelOf(current, openIndex)}
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img src={current.url} alt={labelOf(current, openIndex)} />
              )}
              {viewable.length > 1 && (
                <>
                  <ActionIcon
                    className={classes.prev}
                    size={44}
                    radius="xl"
                    variant="default"
                    aria-label="이전 사진·영상"
                    disabled={viewablePosition <= 0}
                    onClick={() => move(-1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </ActionIcon>
                  <ActionIcon
                    className={classes.next}
                    size={44}
                    radius="xl"
                    variant="default"
                    aria-label="다음 사진·영상"
                    disabled={viewablePosition >= viewable.length - 1}
                    onClick={() => move(1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </ActionIcon>
                </>
              )}
            </div>
            {viewable.length > 1 && (
              <ul className={classes.strip} aria-label="사진·영상 고르기">
                {viewable.map((item) => {
                  const i = media.indexOf(item)
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        className={classes.thumbButton}
                        aria-label={`${labelOf(item, i)} 보기`}
                        aria-pressed={i === openIndex}
                        onClick={() => setOpenIndex(i)}
                      >
                        <Thumb item={item} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
