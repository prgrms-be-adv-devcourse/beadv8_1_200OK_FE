import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { ProductRegion } from '@/shared/api/types'
import { formatAmount } from '@/shared/lib/format'
import { regionLabels } from '@/shared/lib/labels'
import { FarmAvatar } from '../FarmAvatar/FarmAvatar'
import classes from './FarmCard.module.css'

// 농가 카드: 사진 56 + 상호(명조, 상점 링크) + 지역 · 팔로워 + 소개(선택) + 오른쪽 액션 1개(팔로우 또는 상점 보기)
// 흰 카드, radius 12, 패딩 24(모바일 16). 시안: b2c/Home ‘단골이 많은 농가’, b2c/Main ‘생산 정보’

export type FarmCardProps = {
  name: string
  /** 상점 경로 (/farms/:farmId) */
  to: string
  imageUrl?: string | null
  region?: ProductRegion | null
  followerCount?: number
  /** 소개 한 줄 */
  description?: ReactNode
  /** 상호 옆 배지 (예: 판매 중지 StatusBadge) */
  badge?: ReactNode
  /** 지역 · 팔로워 뒤에 이어 붙일 정보 (예: 판매 중인 상품 3개) */
  extraMeta?: string
  /** 오른쪽 액션 (FollowButton 또는 상점 보기 버튼) */
  action?: ReactNode
  /** 상호 제목 단계 */
  headingLevel?: 'h2' | 'h3' | 'h4'
}

export function FarmCard({
  name,
  to,
  imageUrl,
  region,
  followerCount,
  description,
  badge,
  extraMeta,
  action,
  headingLevel: Heading = 'h3',
}: FarmCardProps) {
  const meta = [
    region ? regionLabels[region] : null,
    followerCount === undefined ? null : `팔로워 ${formatAmount(followerCount)}명`,
    extraMeta ?? null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className={classes.root}>
      <FarmAvatar name={name} imageUrl={imageUrl} size={56} />
      <div className={classes.body}>
        <div className={classes.nameRow}>
          <Heading className={`pd-serif ${classes.name}`}>
            <Link to={to} className={classes.link}>
              {name}
            </Link>
          </Heading>
          {badge}
        </div>
        {description && <p className={classes.description}>{description}</p>}
        {meta && <p className={`pd-num ${classes.meta}`}>{meta}</p>}
      </div>
      {action && <div className={classes.action}>{action}</div>}
    </article>
  )
}
