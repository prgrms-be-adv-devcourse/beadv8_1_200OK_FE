# 팔도곳간 Frontend

농가 직거래 마켓 웹 프론트엔드. 구매자 서비스(`/`), 판매자 센터(`/seller/*`), 운영 콘솔(`/admin/*`)을 한 앱에서 라우트로 나눠요.
React 19 · TypeScript · Vite · React Router(data mode) · TanStack Query · Mantine + CSS Modules · React Hook Form + Zod · Zustand · Axios.

## 명령어

```bash
pnpm dev          # 개발 서버. /api는 VITE_API_PROXY_TARGET으로 프록시 (아래 '서버 연결')
pnpm typecheck    # tsc -b
pnpm check        # Biome lint + format (고칠 때 check:fix)
pnpm test         # Vitest (특정 폴더: pnpm vitest run src/features/cart)
```

- Node 24가 필요해요(`.nvmrc`). 셸 기본 `node`가 23이면 vitest 워커가 뜨지 않아요. 비대화형 셸에서는 nvm의 Node 24 `bin`을 PATH 앞에 두고 실행해요.
- 작업을 마치기 전에 `typecheck`·`check`·`test`가 모두 통과해야 해요.

## 구조

```
src/app/       라우트(routes.tsx), 레이아웃, 가드(RequireAuth·RequireSeller·RequireAdmin·GuestOnly), 개발용 /__design
src/features/  화면 단위 기능. 다른 feature는 index.ts로 공개한 것만 쓴다
src/shared/    api(요청·토큰·오류) · ui(공통 컴포넌트) · lib(유틸·라벨·상수) · styles(테마·토큰)
src/mocks/     MSW 핸들러 — 테스트 전용
src/test/      Vitest setup, render 래퍼, fakeToken
```

- 의존 방향은 `app → features → shared`. Biome `noRestrictedImports`가 막아요: feature 내부(`api`·`queries`·`schemas`·`components`) 직접 import 금지, shared에서 features·app import 금지, 앱 코드에서 mocks import 금지.
- feature끼리 import는 `products → cart`(상품 상세의 담기) 하나만 있어요. 둘 이상이 쓰는 코드는 shared로 올려요(예: `shared/api/productDetail.ts`).
- feature 안 파일 역할:
  - `api.ts` 요청 함수, `queries.ts` 쿼리 키·훅
  - `pages/` 라우트 컴포넌트: 쿼리·mutation·라우터를 연결해 View에 props로 넘김
  - `views/` 표시 전용: props만 받아 그리고 API·쿼리·스토어를 import하지 않음
  - `fixtures.ts` 샘플 데이터, `previews.tsx` `/__design` 상태 갤러리(View를 fixtures로 그림)
- 판매자·관리자 화면은 각각 지연 로딩 청크(`app/chunks/`)로 묶여요. 새 화면은 청크 모듈에서 내보내고 `routes.tsx`에 이름으로 연결해요.

## 서버 연결

- 요청은 `apiClient`(`shared/api/client.ts`)로만 보내요. 경로는 `/api/v1/...` 그대로 쓰고, 백엔드 주소는 코드에 적지 않고 env로만 정해요(`.env.example`).
  - `VITE_API_PROXY_TARGET`: 개발 서버 프록시가 `/api`를 보낼 백엔드. 지금은 로컬 서버(`http://localhost:8080`)예요.
  - `VITE_API_BASE_URL`: 브라우저가 직접 부를 API 오리진(`/api/v1` 없이). 비우면 같은 오리진으로 보내 프록시를 타요. API 서버가 배포되면 여기에 그 오리진을 넣어요(백엔드 CORS가 열려 있어야 해요).
- API 계약의 기준은 지금 연결한 백엔드의 Swagger(`{백엔드}/v3/api-docs`)예요. 아직 API 서버가 배포 전이라 로컬 서버 기준이에요. `bruno_for_front/`는 예시·오류 케이스 참고용이에요.
- **인증**: 로그인 accessToken은 메모리에만 있어요(`shared/api/authToken.ts`). 새로고침하면 다시 로그인해요. 역할·회원 번호는 토큰 payload에서 읽어요(`app/session.ts`의 `useSession`).
  - 토큰이 거절되면(401) 세션을 끝내고 토큰 없이 한 번 더 보내요. 그래도 401이면 `/login?returnTo=`로 보내요.
  - 판매자 상품 쓰기·정산 API는 아직 `X-Member-Id`·`X-Member-Role` 임시 헤더로 회원을 받아요. `shared/api/memberHeaders.ts`가 경로를 보고 자동으로 붙여요.
- **쿼리 키**: 키 팩토리는 feature가 갖고, 첫 칸은 `queryKeyPrefix.*`(`shared/api/queryKeys.ts`)예요. 다른 feature의 캐시는 접두어로 무효화해요(`invalidateQueries({ queryKey: [queryKeyPrefix.products] })`).
- **오류**: 모든 오류는 `ApiError{status, detail, fieldErrors}`로 와요. 사용자에게는 `detail`을 보여 줘요.
  - 422 → `useServerFieldErrors(setError, error.fieldErrors)`로 칸에 붙이고 첫 칸에 focus해요.
  - `errors` 없이 오는 필드 오류(예: 가입 409 중복)는 `detail` 문구로 칸을 골라요.
  - 서버에 아직 없는 API는 404 `"No static resource …"`가 와요. 이 원문은 화면에 내지 말고 해요체 안내로 바꿔요(예: `features/reviews/errors.ts`).
- **업로드**: `useMediaUploads(MediaPurpose.X)`(`shared/ui`)와 `PhotoUploader`를 같이 써요. 제출할 때는 `urls`(다 올린 서버 주소)만 보내고, `uploading`이면 제출을 막아요.
- 실서버 확인은 연결한 백엔드에 curl로 해요. 계정은 `POST /api/v1/members/signup`으로 새로 만들어요(가입하면 BUYER). 남의 데이터는 건드리지 않고, 확인용으로 만든 상품은 지워요.

## API가 없는 곳

- API로 연결된 feature: auth · products · cart · checkout · wallet(약관) · reviews · seller(상품·정산). orders · me · farms · sellerApply · admin, 그리고 연결된 feature 안의 일부는 아직 `fixtures`로 그려요.
- API가 없어 임시로 처리한 곳에는 `TODO(api)` 주석이 있어요(`grep -rn "TODO(api)" src`). API가 생기면 이 주석을 따라 걷어내요.
- 브라우저 저장소에 둔 임시 데이터:
  - `features/seller/productCache.ts`(localStorage): 판매자 본인 상품 목록과 수정용 version. 판매자 상품 목록·상세 API가 없어서 써요.
  - `features/cart/optionProducts.ts`(localStorage): 옵션 번호 → 상품 번호. 장바구니 조회에 `productId`가 없어서 써요.
  - `features/checkout/draftStore.ts`(sessionStorage): 충전하고 돌아올 때까지 남기는 배송지 초안. API가 아니라 정책이라 계속 남아요.

## 테스트

- API가 엮인 동작은 MSW로 테스트해요. 기본 응답은 `src/mocks/handlers/<feature>.ts`에 두고 `index.ts`에 등록해요. 실패 시나리오는 테스트 안에서 `server.use(...)`로 덮어요. 핸들러가 없는 요청은 테스트를 실패시켜요.
- 렌더는 `@/test/render`(테마 + 새 QueryClient)로 하고, 로그인 상태는 `setAccessToken(fakeToken({ role }))`로 만들어요. 테스트가 끝나면 `clearAccessToken()`.
- 버그를 고치면 재현 테스트를 같이 더해요. jsdom은 multipart 본문을 읽지 못하니 업로드는 `Content-Type` 헤더로 확인해요.

## 화면 작업

- 색·간격·radius·그림자는 Mantine 테마(`shared/styles/theme.ts`)와 CSS 변수(`shared/styles/tokens.css`의 `--pd-*`)로만 써요. 컴포넌트에 hex 값을 직접 쓰지 않아요.
- Mantine 컴포넌트를 먼저 써요. 없는 것만 `shared/ui`에 만들어요(가격 `PriceText`, 상태 `StatusBadge`, 비활성 이유 `DisabledReason`, 로딩·오류 `QueryState` 등).
- 상태는 색만으로 전달하지 않아요. 색 + 아이콘 + 문구를 같이 써요(배지 매핑은 `StatusBadge` 한 곳).
- 접근성:
  - 클릭 요소는 실제 `button`·`a`를 써요. 아이콘 버튼에는 `aria-label`을 달아요.
  - 터치 영역은 44px 이상으로 해요.
  - 폼 오류는 입력과 연결하고, 제출에 실패하면 첫 오류로 focus해요.
  - 모달을 닫으면 연 버튼으로 focus를 돌려놓아요.
- 모바일 우선 반응형이에요. 기준은 768 / 1024(Mantine `md`). 화면을 바꿨으면 390·1440 너비에서 가로 스크롤이 없는지 확인해요.
- 화면 상태(로딩·빈 목록·오류·권한 등)는 `previews.tsx`에 추가해서 `/__design/screen/:screenId?state=`로 볼 수 있게 해요.

## 문구

- 해요체로 짧게 써요. 예: "장바구니에 담았어요", "사진을 다 올린 뒤 저장할 수 있어요".
- 비활성 버튼에는 이유 문구를 둬요. 오류는 무엇이 잘못됐고 어떻게 고치는지 알려 줘요.
- 금액은 `23,900원`, 차감은 `−717원`(유니코드 마이너스)으로 써요. 포맷은 `shared/lib/format.ts`를 써요.