import { Button } from '@mantine/core'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import classes from './EmptyView.module.css'

// 빈 상태 · 권한 제한 · 404 공통 틀: 아이콘 40 + 제목 + 설명 + CTA 1개(Secondary)
// 시안: Components.dc.html ‘공통 상태 화면’

export type ViewAction = {
  label: string
  /** 이동할 경로. 없으면 onClick */
  to?: string
  onClick?: () => void
}

export type EmptyViewProps = {
  /** 40px 아이콘 (lucide, aria-hidden) */
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ViewAction
  /** stack: 가운데 세로 (기본) / inline: 한 줄 (404 띠) */
  layout?: 'stack' | 'inline'
}

export function ViewActionButton({ action }: { action: ViewAction }) {
  return action.to ? (
    <Button component={Link} to={action.to} variant="outline">
      {action.label}
    </Button>
  ) : (
    <Button variant="outline" onClick={action.onClick}>
      {action.label}
    </Button>
  )
}

export function EmptyView({ icon, title, description, action, layout = 'stack' }: EmptyViewProps) {
  return (
    <div className={classes.root} data-layout={layout}>
      {icon && (
        <span className={classes.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <div className={classes.text}>
        <p className={classes.title}>{title}</p>
        {description && <p className={classes.description}>{description}</p>}
      </div>
      {action && (
        <div className={classes.action}>
          <ViewActionButton action={action} />
        </div>
      )}
    </div>
  )
}
