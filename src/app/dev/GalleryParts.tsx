import { Title } from '@mantine/core'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import classes from './DesignGallery.module.css'

// 갤러리 공통 틀. 0-2·0-3·0-4 묶음도 이 틀로 섹션을 추가한다.

type GallerySectionProps = {
  id: string
  title: string
  /** 사양 출처나 확인할 점 한 줄 */
  meta?: ReactNode
  children: ReactNode
}

export function GallerySection({ id, title, meta, children }: GallerySectionProps) {
  return (
    <section id={id} className={classes.section} aria-labelledby={`${id}-title`}>
      <header className={classes.sectionHeader}>
        <Title order={2} id={`${id}-title`}>
          {title}
        </Title>
        {meta && <p className={classes.sectionMeta}>{meta}</p>}
      </header>
      {children}
    </section>
  )
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className={classes.panel}>
      {title && (
        <Title order={3} mb="sm">
          {title}
        </Title>
      )}
      {children}
    </div>
  )
}

/** 같은 부품의 상태를 나란히 놓는 격자 */
export function StateGrid({ children }: { children: ReactNode }) {
  return <div className={classes.stateGrid}>{children}</div>
}

export function StateItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={classes.stateItem}>
      <span className={classes.stateLabel}>{label}</span>
      {children}
    </div>
  )
}

/** children 안에서 selector에 맞는 첫 요소의 실제 높이를 보여 준다(사양 대조용) */
export function Measure({
  selector,
  expected,
  children,
}: {
  selector: string
  expected: number
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()

  useLayoutEffect(() => {
    const target = ref.current?.querySelector(selector)
    if (!target) return
    const observer = new ResizeObserver(() => {
      setHeight(Math.round(target.getBoundingClientRect().height))
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [selector])

  return (
    <div ref={ref} className={classes.stateItem}>
      {children}
      <span className={classes.measureValue}>
        높이 {height ?? '–'}px · 사양 {expected}px {height === expected ? '✓' : ''}
      </span>
    </div>
  )
}
