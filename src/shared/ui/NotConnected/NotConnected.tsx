import { VisuallyHidden } from '@mantine/core'
import { Unplug } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyView, type ViewAction } from '../EmptyView/EmptyView'

// API가 아직 없어 연결하지 못한 화면·섹션·값을 한 모양으로 보여 준다(2026-10-20 결정).
// 가짜(fixtures) 데이터를 그리지 않고, 비어 있는 이유가 ‘데이터 없음’이 아니라 ‘연결 전’임을 드러낸다.
// 필요한 API 이름은 개발 서버에서만 덧붙인다. 버튼을 막을 때는 DisabledReason에 NOT_CONNECTED_REASON을 쓴다.

/** 막은 버튼 아래에 붙이는 이유 문구 */
export const NOT_CONNECTED_REASON = '아직 연결되지 않은 기능이에요'

export type NotConnectedProps = {
  /** 기본: ‘아직 연결되지 않은 화면이에요’ */
  title?: string
  description?: ReactNode
  /** 필요한 API (예: 'GET /sellers/me/orders'). 개발 서버에서만 보인다 */
  api?: string
  /** stack: 화면·큰 섹션 / inline: 작은 섹션 한 줄 */
  layout?: 'stack' | 'inline'
  action?: ViewAction
}

export function NotConnected({
  title = '아직 연결되지 않은 화면이에요',
  description = '서버 기능이 준비되면 여기에 보여 드릴게요.',
  api,
  layout = 'stack',
  action,
}: NotConnectedProps) {
  return (
    <EmptyView
      icon={<Unplug />}
      title={title}
      description={
        api && import.meta.env.DEV ? (
          <>
            {description}
            <br />
            <code>필요한 API: {api}</code>
          </>
        ) : (
          description
        )
      }
      layout={layout}
      action={action}
    />
  )
}

/** 연결 전이라 모르는 숫자·값 자리. 화면엔 ‘–’, 화면 읽기 프로그램엔 ‘연결 전’ */
export function NotConnectedValue() {
  return (
    <span title={NOT_CONNECTED_REASON}>
      <span aria-hidden="true">–</span>
      <VisuallyHidden>연결 전</VisuallyHidden>
    </span>
  )
}
