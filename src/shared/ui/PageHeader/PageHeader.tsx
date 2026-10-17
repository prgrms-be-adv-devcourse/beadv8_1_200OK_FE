import { ActionIcon } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import classes from './PageHeader.module.css'

// 페이지 제목. 데스크톱: 경로(breadcrumb) + H1 28/38 + 오른쪽 보조 액션
// 모바일(< 1024): 상단 56 바 — 뒤로 + 제목 17/24 + 오른쪽 액션. 제목 h1은 하나만 그린다.
// 시안: seller/SellerProductForm(경로·H1), b2c/OrdersMobile(뒤로 바)

export type Crumb = { label: string; to?: string }

export type PageHeaderProps = {
  title: string
  /** 경로 표시. 마지막 항목은 현재 페이지(링크 없음) */
  breadcrumbs?: Crumb[]
  /** 오른쪽 보조 액션 (버튼 1~2개) */
  actions?: ReactNode
  /** 모바일 뒤로 버튼 경로. 없으면 onBack, 둘 다 없으면 뒤로 버튼 없음 */
  backTo?: string
  onBack?: () => void
  /** 화면 너비 대신 모양을 고정한다(갤러리 미리보기용). 기본 auto */
  layout?: 'auto' | 'desktop' | 'mobile'
  /** 모바일에서 그리지 않는다. 레이아웃 상단 바가 제목을 보여 주는 판매자·관리자 화면용 */
  hideOnMobile?: boolean
}

export function PageHeader({
  title,
  breadcrumbs,
  actions,
  backTo,
  onBack,
  layout = 'auto',
  hideOnMobile = false,
}: PageHeaderProps) {
  const hasBack = backTo !== undefined || onBack !== undefined
  // 첫 렌더부터 맞는 모양을 그리도록 미디어 쿼리를 동기로 읽는다 (데스크톱 ≥ 1024 = md)
  const isDesktop = useMediaQuery('(min-width: 64em)', undefined, {
    getInitialValueInEffect: false,
  })
  const resolved = layout === 'auto' ? (isDesktop ? 'desktop' : 'mobile') : layout
  if (resolved === 'mobile' && hideOnMobile) return null

  return (
    <header className={classes.root} data-layout={resolved}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="현재 위치" className={classes.breadcrumbs}>
          <ol>
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1
              return (
                <li key={crumb.to ?? crumb.label}>
                  {last || !crumb.to ? (
                    <span aria-current={last ? 'page' : undefined}>{crumb.label}</span>
                  ) : (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      )}
      <div className={classes.bar}>
        {backTo !== undefined ? (
          <ActionIcon component={Link} to={backTo} className={classes.back} aria-label="뒤로">
            <ChevronLeft size={24} aria-hidden="true" />
          </ActionIcon>
        ) : (
          hasBack && (
            <ActionIcon className={classes.back} aria-label="뒤로" onClick={onBack}>
              <ChevronLeft size={24} aria-hidden="true" />
            </ActionIcon>
          )
        )}
        <h1 className={classes.title}>{title}</h1>
        {actions && <div className={classes.actions}>{actions}</div>}
      </div>
    </header>
  )
}
