# app

진입·조립 계층. `main.tsx`(진입), `providers/`(MantineProvider·QueryClientProvider), `router.tsx`(createBrowserRouter, 라우트 표는 설계서 "화면·라우트·렌더링"), `layouts/`(RootLayout·PublicLayout·AuthLayout·SellerLayout), `guards/`(features/auth의 RequireAuth·RequireSeller·GuestOnly를 라우트에 적용).

features·shared를 import할 수 있고, 그 반대는 금지(ADR-0003).
