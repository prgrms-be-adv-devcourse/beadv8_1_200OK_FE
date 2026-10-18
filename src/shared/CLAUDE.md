# shared

feature에 속하지 않는 공통 코드. features·app을 import하지 않는다(ADR-0003).

- `api/` — 서버 계약과 요청 (2-0)
  - `client.ts` Axios 인스턴스 `apiClient`(Bearer 붙임, 오류 → `ApiError`, 401 → `onUnauthorized`). 요청은 이것으로만
  - `authToken.ts` accessToken 메모리 보관 · 토큰 payload에서 역할 읽기 · 만료 타이머(localStorage에 두지 않음)
  - `memberHeaders.ts` 임시 헤더(X-Member-*) 경로 규칙 — 서버가 토큰 방식으로 바뀌면 삭제
  - `ApiError.ts` · `queryClient.ts` · `queryKeys.ts`(접두어만, 키 팩토리는 feature 소유) · `types.ts`(Bruno 타입)
- `ui/` — Mantine으로 안 되는 공통·도메인 컴포넌트. `@/shared/ui`(index.ts)로 import한다 (AddressModal은 다음 우편번호 포함)
  - PriceText · StatusBadge · OriginTag · LedgerBlock · ProductCard · ProductGrid · OptionCard · QuantityStepper · QueryState · EmptyView · PageHeader(PageBreadcrumbs) · DisabledReason · CtaBar · RatingStars · PhotoUploader · FarmAvatar · FarmCard · FollowButton · LoginRequiredModal · AddressModal · PayoutDetailModal(판매자·관리자 정산 상세) · showToast
  - 상태값 → 배지 색·아이콘·문구는 StatusBadge 한 곳에서만 정한다
- `lib/` — 순수 유틸(format·labels·productState·shipmentState·claimState·withdrawalState·sellerApplicationState·rating·returnTo·daumPostcode·lazyWithRetry·env(API 오리진·PG 키)), 정책 상수 `constants.ts`(DECISIONS.md D), 화면 상태 갤러리 계약 `screenPreview.ts`
- `styles/` — Mantine theme(토큰), 전역 CSS, CSS Modules 공통 변수
  - `theme.ts` 토큰 · `components.ts` Mantine 컴포넌트별 defaultProps·classNames·vars · `components/*.module.css` 그 스타일
  - 상태 색은 `color="success|warning|error|info|neutral|primary|straw"` + variant light (`variantColorResolver.ts`)
  - Mantine CSS는 `@layer mantine`이라 여기 CSS가 항상 우선한다. Mantine 기본 규칙을 덮을 때 활성·선택 상태 색까지 같이 덮였는지 확인한다
