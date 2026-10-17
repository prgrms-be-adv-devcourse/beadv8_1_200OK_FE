import { Hammer } from 'lucide-react'
import { EmptyView, PageHeader } from '@/shared/ui'
import { useRouteHandle } from '../routeHandle'

// 아직 만들지 않은 화면. 라우터 뼈대(0-4-6)에서 모든 라우트가 이 빈 페이지를 그린다.
// 1단계에서 화면을 만들면 그 라우트의 Component만 바꾼다.

export function PlaceholderPage({ console = false }: { console?: boolean }) {
  const { title = '화면', screenId } = useRouteHandle()
  return (
    <>
      <PageHeader title={title} hideOnMobile={console} />
      <EmptyView
        icon={<Hammer />}
        title="화면을 만들고 있어요"
        description={screenId ? `${screenId} · 1단계에서 채워요` : '1단계에서 채워요'}
      />
    </>
  )
}

export function ConsolePlaceholderPage() {
  return <PlaceholderPage console />
}
