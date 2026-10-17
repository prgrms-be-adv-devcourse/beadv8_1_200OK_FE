import { Heart, Image as ImageIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { ProductSummary } from '@/shared/api/types'
import { regionLabels } from '@/shared/lib/labels'
import { getProductSaleState, productSaleStateLabels } from '@/shared/lib/productState'
import { OriginTag } from '../OriginTag/OriginTag'
import { PriceText } from '../PriceText/PriceText'
import { RatingStars } from '../RatingStars/RatingStars'
import classes from './ProductCard.module.css'

// 상품 카드: 이미지 1:1 → 산지 라인 → 상품명(2줄) → 가격 → 평점(리뷰 0개면 숨김) → 꼬리표 + 옵션 수.
// 담기 버튼은 두지 않는다(옵션을 골라야 해서 상세로 이동). 카드 전체가 상세 링크이고 관심 하트는 따로 누른다.
// 판매자 상호·옵션 수·수확일은 ProductSummary에 없어 따로 받는다(DECISIONS.md A-2).

export type ProductCardProps = {
  product: ProductSummary
  /** 산지 라인 뒤에 붙는 판매자 상호 */
  sellerName?: string
  optionCount?: number
  harvestDate?: string | Date
  /** 판매자 정지 (API 미정, C-9) */
  sellerSuspended?: boolean
  /** 관심 하트. onToggleLike가 없으면 하트를 그리지 않는다 */
  liked?: boolean
  onToggleLike?: () => void
  /** 상세 경로 (기본 /products/:productId) */
  to?: string
}

export function ProductCard({
  product,
  sellerName,
  optionCount,
  harvestDate,
  sellerSuspended,
  liked = false,
  onToggleLike,
  to = `/products/${product.productId}`,
}: ProductCardProps) {
  const saleState = getProductSaleState(product, { sellerSuspended })
  const originLine = [regionLabels[product.region], sellerName].filter(Boolean).join(' · ')
  const hasMeta = harvestDate !== undefined || optionCount !== undefined

  return (
    <article className={classes.root}>
      <div className={classes.media}>
        {product.thumbnailUrl ? (
          <img className={classes.image} src={product.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <div className={classes.placeholder}>
            <ImageIcon size={32} aria-hidden="true" />
          </div>
        )}
        {saleState && (
          <div className={classes.veil}>
            <span className={classes.veilLabel}>{productSaleStateLabels[saleState]}</span>
          </div>
        )}
      </div>

      <span className={classes.origin}>{originLine}</span>
      <h3 className={classes.name}>
        <Link to={to} className={classes.link}>
          {product.name}
        </Link>
      </h3>
      <PriceText amount={product.minSalePrice} discountRate={product.discountRate} size="M" />
      {product.reviewCount > 0 && (
        <RatingStars
          value={product.averageRating}
          reviewCount={product.reviewCount}
          variant="compact"
        />
      )}
      {hasMeta && (
        <span className={classes.meta}>
          {harvestDate !== undefined && <OriginTag kind="harvest" date={harvestDate} />}
          {optionCount !== undefined && <span>옵션 {optionCount}개</span>}
        </span>
      )}

      {onToggleLike && (
        <button
          type="button"
          className={classes.like}
          aria-pressed={liked}
          aria-label={`${product.name} 관심 상품`}
          onClick={onToggleLike}
        >
          <span className={classes.likeCircle} data-liked={liked || undefined}>
            <Heart size={18} aria-hidden="true" />
          </span>
        </button>
      )}
    </article>
  )
}
