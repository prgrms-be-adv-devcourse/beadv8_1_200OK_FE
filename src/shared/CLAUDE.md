# shared

feature에 속하지 않는 공통 코드. features·app을 import하지 않는다(ADR-0003).

- `api/` — feature는 `@/shared/api` 배럴(`index.ts`)만 import한다.
  - `client.ts` — `apiClient` Axios 인스턴스(`withCredentials`, 10초 timeout). 요청 인터셉터가 어댑터 `attach`, 응답 인터셉터가 오류를 `ApiError`로 정규화. 401은 어댑터 `handleUnauthorized` → 실패 시 `onUnauthorized` 핸들러 호출. 요청 옵션 `skipUnauthorizedHandler`(로그인 실패처럼 401이 정상인 요청), `skipAuthRetry`(refresh·재시도 요청)
  - `error.ts` — `ApiError{status, code, message, details}`, `toApiError`, `isApiError`. status 0은 응답 없음(네트워크·타임아웃·취소)
  - `auth-adapter.ts` — `AuthAdapter` 인터페이스, 기본 `cookieAuthAdapter`, `setAuthAdapter`(ADR-0004)
  - `unauthorized.ts` — `onUnauthorized(handler)` 구독(해제 함수 반환)
  - `queryClient.ts` — 전역 `QueryClient`. staleTime 0, 4xx는 재시도 없음, 5xx·네트워크는 2회. TanStack `Register.defaultError = ApiError`
  - `queryKeys.ts` — `QUERY_KEY_PREFIX` 접두어 상수(ADR-0003)
- `ui/` — Mantine 조합 공통 컴포넌트(QueryState·PageHeader·EmptyView·PriceText)
- `lib/` — 순수 유틸(formatPrice·lazyWithRetry·env)
- `styles/` — Mantine theme(토큰), 전역 CSS, CSS Modules 공통 변수
