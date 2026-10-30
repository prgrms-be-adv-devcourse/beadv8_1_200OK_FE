import { Alert, Skeleton, Stack, VisuallyHidden } from '@mantine/core'
import { CircleX, Lock, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyView, type EmptyViewProps, ViewActionButton } from '../EmptyView/EmptyView'
import classes from './QueryState.module.css'

// 데이터 영역의 상태 분기: 로딩(스켈레톤) · 오류(다시 시도) · 빈 상태 · 권한 제한 · 404 · 정상(children)
// View는 status만 받는다. 2단계에서 TanStack Query 결과를 status로 바꿔 넘긴다.

export type QueryStatus = 'pending' | 'error' | 'empty' | 'forbidden' | 'notFound' | 'success'

export type QueryStateProps = {
  status: QueryStatus
  children?: ReactNode
  /** 로딩 때 실제 레이아웃 모양의 스켈레톤. 없으면 기본 블록 */
  skeleton?: ReactNode
  /** 로딩을 읽어 줄 문구 */
  loadingLabel?: string
  /** 빈 상태 (화면마다 문구가 달라 status가 empty면 꼭 넘긴다) */
  empty?: EmptyViewProps
  forbidden?: Partial<EmptyViewProps>
  notFound?: Partial<EmptyViewProps>
  /** 오류 문구 (서버 detail이 있으면 그것) */
  errorMessage?: string
  onRetry?: () => void
}

function DefaultSkeleton() {
  return (
    <Stack gap={10}>
      <Skeleton style={{ aspectRatio: '2 / 1' }} />
      <Skeleton h={14} w="60%" />
      <Skeleton h={18} w="85%" />
      <Skeleton h={22} w="40%" />
    </Stack>
  )
}

export function QueryState({
  status,
  children,
  skeleton,
  loadingLabel = '불러오고 있어요',
  empty,
  forbidden,
  notFound,
  errorMessage = '잠시 후 다시 시도해 주세요.',
  onRetry,
}: QueryStateProps) {
  switch (status) {
    case 'pending':
      return (
        <div aria-busy="true">
          <VisuallyHidden role="status">{loadingLabel}</VisuallyHidden>
          {skeleton ?? <DefaultSkeleton />}
        </div>
      )
    case 'error':
      return (
        <div className={classes.error}>
          <Alert color="error" icon={<CircleX />} title="불러오지 못했어요" role="alert">
            {errorMessage}
          </Alert>
          {onRetry && <ViewActionButton action={{ label: '다시 시도', onClick: onRetry }} />}
        </div>
      )
    case 'empty':
      return <EmptyView title="아직 내용이 없어요" {...empty} />
    case 'forbidden':
      return <EmptyView icon={<Lock />} title="이용할 수 있는 권한이 없어요" {...forbidden} />
    case 'notFound':
      return (
        <EmptyView
          icon={<Search />}
          title="찾으시는 페이지가 없어요"
          action={{ label: '홈으로', to: '/' }}
          layout="inline"
          {...notFound}
        />
      )
    case 'success':
      return <>{children}</>
  }
}
