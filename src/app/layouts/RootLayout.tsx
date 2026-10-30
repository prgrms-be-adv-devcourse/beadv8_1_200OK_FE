import { isRouteErrorResponse, Outlet, ScrollRestoration, useRouteError } from 'react-router'
import { EmptyView, QueryState } from '@/shared/ui'
import classes from './RootLayout.module.css'

// 맨 바깥 라우트. providers(MantineProvider · 토스트 Notifications · DatesProvider · 아이콘)는
// app/providers/AppProviders가 RouterProvider 바깥에서 감싼다 → 이 라우트의 ErrorBoundary 화면도 테마를 받는다.

export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}

/** 첫 진입이 지연 로딩 라우트일 때 청크를 받는 동안 그릴 것 */
export function RootHydrateFallback() {
  return null
}

/** 화면을 그리다 난 오류·없는 주소. 지연 로딩 청크가 새로고침 뒤에도 실패한 경우도 여기로 온다 */
export function RootErrorBoundary() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  if (import.meta.env.DEV && !notFound) console.error(error)

  return (
    <main className={classes.errorPage}>
      {notFound ? (
        <QueryState status="notFound" />
      ) : (
        <EmptyView
          title="화면을 보여 드리지 못했어요"
          description="새로고침해도 계속되면 잠시 후 다시 들어와 주세요."
          action={{ label: '새로고침', onClick: () => window.location.reload() }}
        />
      )}
    </main>
  )
}
