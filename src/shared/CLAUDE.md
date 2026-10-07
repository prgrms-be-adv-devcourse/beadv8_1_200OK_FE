# shared

feature에 속하지 않는 공통 코드. features·app을 import하지 않는다(ADR-0003).

- `api/` — Axios 인스턴스(`withCredentials`), `ApiError` 정규화, 401 이벤트, 인증 어댑터 슬롯(ADR-0004), `queryClient`, 쿼리키 접두어 상수
- `ui/` — Mantine 조합 공통 컴포넌트(QueryState·PageHeader·EmptyView·PriceText)
- `lib/` — 순수 유틸(formatPrice·lazyWithRetry·env)
- `styles/` — Mantine theme(토큰), 전역 CSS, CSS Modules 공통 변수
