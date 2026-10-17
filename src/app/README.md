# app

진입·조립 계층. features·shared를 import할 수 있고, 그 반대는 금지(ADR-0003).

- `main.tsx` — 진입. CSS 순서, `AppProviders`로 `RouterProvider`를 감싼다
- `providers/` — MantineProvider(테마)·DatesProvider·Notifications(토스트)·LucideProvider. 라우터 바깥이라 오류 화면도 테마를 받는다
- `routes.tsx` — 라우트 표(design/SCREENS.md). 화면 정보는 라우트 `handle`(`routeHandle.ts`: title·screenId·mobileHeader·tabBar)
- `router.tsx` — `createBrowserRouter(routes)`
- `chunks/` — 지연 로딩 청크 모듈. `/seller/*`(sellerChunk)·`/admin/*`(adminChunk) 화면과 레이아웃은 여기서만 내보낸다. `lazyWithRetry`로 감싼다(FE-Q-005)
- `layouts/` — RootLayout(ScrollRestoration·ErrorBoundary) → PublicLayout / AuthLayout / SellerLayout · AdminLayout(ConsoleShell). 레이아웃은 props만 받는 `*View`와 라우트용 래퍼로 나뉜다
- `guards/` — RequireAuth·RequireSeller·RequireAdmin·GuestOnly. 표시 제어일 뿐 인가는 서버
- `session.ts` — 가드·헤더가 읽는 로그인 상태. 지금은 'unknown'(가드 모두 통과). 2단계에서 features/auth의 `useMe()`로 바꾼다
- `pages/` — 아직 안 만든 화면용 빈 페이지·404
- `dev/` — `/__design` 갤러리와 `/__design/preview/:layout` (개발 서버에서만)

화면을 만들면(1단계): B2C는 `routes.tsx`의 그 라우트 `Component`를, 판매자·관리자는 청크 모듈에서 내보낸 뒤 라우트의 `lazy`가 고르는 이름을 바꾼다.
판매자·관리자 화면은 레이아웃 상단 바가 모바일 제목을 그리므로 `PageHeader`에 `hideOnMobile`을 준다.
