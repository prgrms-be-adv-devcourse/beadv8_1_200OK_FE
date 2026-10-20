# shared

feature에 속하지 않는 공통 코드. features·app을 import하지 않는다(ADR-0003).

- `api/` — 서버 계약과 요청 (2-0)
  - `client.ts` Axios 인스턴스 `apiClient`(Bearer 붙임, 오류 → `ApiError`, 401 만료 → 재발급 1회 재시도, 그래도 401 → `onUnauthorized`). 요청은 이것으로만
  - `authToken.ts` access·refreshToken 메모리 보관 · 토큰 payload에서 역할 읽기 · 만료 타이머(refresh 없을 때만) · sessionStorage 보관과 앱 시작 시 복원(`restoreAccessToken`, localStorage에는 두지 않음)
  - `reissue.ts` `reissueSession()` — POST /auth/reissue로 두 토큰 교체(동시 호출 1회로 합침). 판매자 승인 뒤 권한 받기에도 쓴다
  - `productDetail.ts` 상품 상세 조회·`productDetailQueryOptions`(키 `[products,'detail',id]`) — products·cart·reviews·seller가 같이 써서 승격
  - `orderDetail.ts` 주문 상세·`orderDetailQueryOptions`(키 `[orders,'detail',id]`) — orders·reviews·checkout이 같이 쓴다
  - `walletBalance.ts` 예치금 잔액·`walletBalanceQueryOptions`(키 `[wallet,'balance']`) — wallet·checkout·me가 같이 쓴다
  - `media.ts` 미디어 업로드 `uploadMedia(purpose, file)` — 화면에서는 `useMediaUploads`로 쓴다
  - `ApiError.ts` · `queryClient.ts` · `queryKeys.ts`(접두어만, 키 팩토리는 feature 소유) · `types.ts`(Bruno 타입)
- `ui/` — Mantine으로 안 되는 공통·도메인 컴포넌트. `@/shared/ui`(index.ts)로 import한다 (AddressModal은 다음 우편번호 포함)
  - PriceText · StatusBadge · OriginTag · LedgerBlock · ProductCard · ProductGrid · OptionCard · QuantityStepper · QueryState · EmptyView · PageHeader(PageBreadcrumbs) · DisabledReason · CtaBar · RatingStars · PhotoUploader(+ `useMediaUploads`: 고르면 바로 업로드 · 진행률 · 실패 문구 · 다 올린 `urls`) · FarmAvatar · FarmCard · FollowButton · LoginRequiredModal · AddressModal · PayoutDetailModal(판매자·관리자 정산 상세, 두 응답 모양을 구조적 타입으로 받음) · showToast
  - 상태값 → 배지 색·아이콘·문구는 StatusBadge 한 곳에서만 정한다
- `lib/` — 순수 유틸(format·labels·dateRange(서버 기간 파라미터)·productState·shipmentState·claimState·withdrawalState·sellerApplicationState·rating·returnTo·daumPostcode·lazyWithRetry·env(API 오리진·PG 키)), 정책 상수 `constants.ts`(DECISIONS.md D), 화면 상태 갤러리 계약 `screenPreview.ts`
- `styles/` — Mantine theme(토큰), 전역 CSS, CSS Modules 공통 변수
  - `theme.ts` 토큰 · `components.ts` Mantine 컴포넌트별 defaultProps·classNames·vars · `components/*.module.css` 그 스타일
  - 상태 색은 `color="success|warning|error|info|neutral|primary|straw"` + variant light (`variantColorResolver.ts`)
  - Mantine CSS는 `@layer mantine`이라 여기 CSS가 항상 우선한다. Mantine 기본 규칙을 덮을 때 활성·선택 상태 색까지 같이 덮였는지 확인한다
