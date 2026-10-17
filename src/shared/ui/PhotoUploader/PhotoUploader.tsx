import { ActionIcon, Badge, FileButton } from '@mantine/core'
import { Dropzone, type FileRejection } from '@mantine/dropzone'
import { ChevronLeft, ChevronRight, CircleX, Image as ImageIcon, ImagePlus, X } from 'lucide-react'
import { useId, useState } from 'react'
import classes from './PhotoUploader.module.css'
import { validatePhotos } from './validatePhotos'

// 사진 올리기: 최대 N장, 장당 10MB, 올리는 중 진행률, 순서 바꾸기(키보드용 앞·뒤 버튼), 오류.
// 업로드 자체는 밖에서 한다: onAdd로 받은 파일을 올리고, items의 progress(0~100)로 진행률을 넘긴다.
// onMove가 있으면 상품 사진형(대표 표시 + 앞·삭제·뒤 버튼), 없으면 리뷰형(작은 칸 + 모서리 삭제).
// 시안: b2c/ReviewWrite(리뷰형), seller/SellerProductForm(상품 사진형)

export type PhotoItem = {
  id: string
  /** 미리보기 주소 (업로드 응답 url 또는 URL.createObjectURL) */
  url: string
  alt?: string
  /** 올리는 중이면 0~100. 다 올렸으면 생략 */
  progress?: number
}

export type PhotoUploaderProps = {
  label: string
  items: PhotoItem[]
  max: number
  maxSizeMb?: number
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  /** 순서 바꾸기. 있으면 상품 사진형 */
  onMove?: (id: string, direction: -1 | 1) => void
  /** 밖에서 정한 오류 (예: ‘상품 사진을 1장 이상 올려 주세요’, 업로드 실패) */
  error?: string | null
  accept?: string[]
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function PhotoUploader({
  label,
  items,
  max,
  maxSizeMb = 10,
  onAdd,
  onRemove,
  onMove,
  error,
  accept = IMAGE_TYPES,
}: PhotoUploaderProps) {
  const labelId = useId()
  const errorId = useId()
  const [pickError, setPickError] = useState<string | null>(null)
  const reorderable = onMove !== undefined
  const remaining = max - items.length
  const shownError = pickError ?? error ?? null

  const handleFiles = (files: File[]) => {
    const { accepted, error: reason } = validatePhotos(files, {
      remaining,
      max,
      maxSizeMb,
      accept,
    })
    setPickError(reason)
    if (accepted.length > 0) onAdd(accepted)
  }

  // 끌어 놓은 파일 중 Dropzone이 거른 것까지 같은 규칙으로 다시 검사해 같은 문구를 쓴다
  const handleDrop = (files: File[], rejections: FileRejection[] = []) =>
    handleFiles([...files, ...rejections.map((rejection) => rejection.file)])

  return (
    <div className={classes.root} data-variant={reorderable ? 'grid' : 'compact'}>
      <span id={labelId} className={classes.label}>
        {label}
        <span className={classes.rule}>
          {' '}
          · 최대 {max}장, 장당 {maxSizeMb}MB 이하
        </span>
      </span>

      <fieldset
        aria-labelledby={labelId}
        aria-describedby={shownError ? errorId : undefined}
        className={classes.tiles}
      >
        {items.map((item, index) => {
          const name = item.alt ?? `${label} ${index + 1}`
          const uploading = item.progress !== undefined && item.progress < 100
          return (
            <div key={item.id} className={classes.tile}>
              <div className={classes.frame}>
                {item.url ? (
                  <img className={classes.image} src={item.url} alt={name} />
                ) : (
                  <div className={classes.placeholder} role="img" aria-label={name}>
                    <ImageIcon size={24} aria-hidden="true" />
                  </div>
                )}
                {reorderable && index === 0 && (
                  <Badge className={classes.cover} color="farm" variant="filled">
                    대표
                  </Badge>
                )}
                {uploading && (
                  <div className={classes.progress}>
                    <div
                      className={classes.bar}
                      role="progressbar"
                      aria-label={`${name} 올리는 중`}
                      aria-valuenow={item.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span style={{ width: `${item.progress}%` }} />
                    </div>
                    <span className={classes.percent} aria-hidden="true">
                      {item.progress}%
                    </span>
                  </div>
                )}
                {!reorderable && (
                  <button
                    type="button"
                    className={classes.cornerRemove}
                    aria-label={`${name} 삭제`}
                    onClick={() => onRemove(item.id)}
                  >
                    <span>
                      <X size={16} aria-hidden="true" />
                    </span>
                  </button>
                )}
              </div>
              {reorderable && (
                <div className={classes.controls}>
                  <ActionIcon
                    aria-label={`${name} 앞으로`}
                    disabled={index === 0}
                    onClick={() => onMove(item.id, -1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </ActionIcon>
                  <ActionIcon aria-label={`${name} 삭제`} onClick={() => onRemove(item.id)}>
                    <X aria-hidden="true" />
                  </ActionIcon>
                  <ActionIcon
                    aria-label={`${name} 뒤로`}
                    disabled={index === items.length - 1}
                    onClick={() => onMove(item.id, 1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </ActionIcon>
                </div>
              )}
            </div>
          )
        })}

        {remaining > 0 && (
          <Dropzone
            className={classes.drop}
            onDrop={(files) => handleDrop(files)}
            onReject={(rejections) => handleDrop([], rejections)}
            accept={accept}
            multiple
            activateOnClick={false}
            activateOnKeyboard={false}
          >
            <FileButton
              onChange={handleFiles}
              accept={accept.join(',')}
              multiple
              inputProps={{ 'aria-label': `${label} 파일 고르기` }}
            >
              {(props) => (
                <button type="button" className={classes.add} {...props}>
                  <ImagePlus aria-hidden="true" />
                  <span className={classes.addLabel}>사진 추가</span>
                  {reorderable ? (
                    <span className={classes.addHelp}>끌어 놓거나 눌러서 올려요</span>
                  ) : (
                    <span className={classes.addHelp}>
                      {items.length}/{max}
                    </span>
                  )}
                </button>
              )}
            </FileButton>
          </Dropzone>
        )}
      </fieldset>

      {shownError && (
        <p id={errorId} className={classes.error} role="alert">
          <CircleX size={16} aria-hidden="true" />
          {shownError}
        </p>
      )}
    </div>
  )
}
