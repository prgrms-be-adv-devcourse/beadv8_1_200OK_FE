import { Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'
import classes from './ProductGallery.module.css'

// 상품 사진: 대표 1:1 + 썸네일 72 버튼(누르면 대표가 바뀜). 첫 장이 대표(API imageUrls).
// 판매할 수 없는 상태면 대표 사진 위에 흰 50% 막 + 라벨(ProductCard와 같은 모양).

export type ProductGalleryProps = {
  images: string[]
  productName: string
  /** 대표 사진 위 라벨 (예: 일시 품절) */
  veilLabel?: string
}

function Photo({ url, label }: { url: string; label: string }) {
  return url ? (
    <img className={classes.image} src={url} alt={label} />
  ) : (
    <span className={classes.placeholder} role="img" aria-label={label}>
      <ImageIcon size={32} aria-hidden="true" />
    </span>
  )
}

export function ProductGallery({ images, productName, veilLabel }: ProductGalleryProps) {
  const [index, setIndex] = useState(0)
  const total = Math.max(images.length, 1)
  const current = images[index] ?? ''

  return (
    <div className={classes.root}>
      <div className={classes.main}>
        <Photo url={current} label={`${productName} 사진 ${index + 1} / ${total}`} />
        {veilLabel && (
          <div className={classes.veil}>
            <span className={classes.veilLabel}>{veilLabel}</span>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <ul className={classes.thumbs} aria-label="상품 사진 고르기">
          {images.map((url, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 같은 주소가 겹칠 수 있어 순서로 구분한다
            <li key={i}>
              <button
                type="button"
                className={classes.thumb}
                aria-label={`사진 ${i + 1}`}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
              >
                {url ? (
                  <img className={classes.image} src={url} alt="" />
                ) : (
                  <ImageIcon size={20} aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
