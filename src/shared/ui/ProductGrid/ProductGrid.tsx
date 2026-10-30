import { Skeleton, VisuallyHidden } from '@mantine/core'
import type { ReactNode } from 'react'
import classes from './ProductGrid.module.css'

// 상품 카드 격자: 모바일 2열(간격 24 · 12), 태블릿부터 최소 240 자동 채움(간격 32 · 24).
// 로딩은 같은 격자의 카드 모양 스켈레톤. 시안: b2c/Home·Category·Store (+ Mobile)

export function ProductGrid({ children }: { children: ReactNode }) {
  return <div className={classes.grid}>{children}</div>
}

export type ProductGridSkeletonProps = {
  count?: number
  /** 읽어 줄 문구 */
  label?: string
}

export function ProductGridSkeleton({
  count = 8,
  label = '상품을 불러오고 있어요',
}: ProductGridSkeletonProps) {
  return (
    <div aria-busy="true">
      <VisuallyHidden role="status">{label}</VisuallyHidden>
      <div className={classes.grid} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 스켈레톤은 자리로만 구분한다
          <div key={i} className={classes.skeleton}>
            <Skeleton className={classes.skeletonImage} />
            <Skeleton h={14} w="60%" />
            <Skeleton h={18} w="85%" />
            <Skeleton h={22} w="40%" />
          </div>
        ))}
      </div>
    </div>
  )
}
