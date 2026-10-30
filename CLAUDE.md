# 팔도곳간 Frontend

농가 직거래 마켓 웹 프론트엔드. 구매자 서비스(`/`), 판매자 센터(`/seller/*`), 운영 콘솔(`/admin/*`)을 한 앱에서 라우트로 나눠요.
React 19 · TypeScript · Vite · React Router(data mode) · TanStack Query · Mantine + CSS Modules · React Hook Form + Zod · Zustand · Axios.

## 명령어

```bash
pnpm dev          # vite(5173) + BFF(8787)를 같이 띄워요. /api·/bff는 BFF를 거쳐요 (아래 'BFF')
pnpm typecheck    # tsc -b + bff
pnpm check        # Biome lint + format (고칠 때 check:fix). bff/도 포함
pnpm test         # Vitest 프론트 + bff (특정 폴더: pnpm vitest run src/features/cart)
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
bff/           Hono BFF (pnpm workspace 패키지 @paldo/bff). 아래 'BFF'
```

- 의존 방향은 `app → features → shared`. Biome `noRestrictedImports`가 막아요: feature 내부(`api`·`queries`·`schemas`·`components`) 직접 import 금지, shared에서 features·app import 금지, 앱 코드에서 mocks import 금지.
- feature끼리 import는 `products → cart`(상품 상세의 담기) 하나만 있어요. 둘 이상이 쓰는 코드는 shared로 올려요(예: `shared/api/productDetail.ts`).
- feature 안 파일 역할:
  - `api.ts` 요청 함수, `queries.ts` 쿼리 키·훅
  - `pages/` 라우트 컴포넌트: 쿼리·mutation·라우터를 연결해 View에 props로 넘김
  - `views/` 표시 전용: props만 받아 그리고 API·쿼리·스토어를 import하지 않음
  - `fixtures.ts` 샘플 데이터, `previews.tsx` `/__design` 상태 갤러리(View를 fixtures로 그림). fixtures는 테스트·previews 전용이에요(아래 'API가 없는 곳')
- 판매자·관리자 화면은 각각 지연 로딩 청크(`app/chunks/`)로 묶여요. 새 화면은 청크 모듈에서 내보내고 `routes.tsx`에 이름으로 연결해요.

## 서버 연결

- 요청은 `apiClient`(`shared/api/client.ts`)로만 보내요. 경로는 `/api/v1/...` 그대로 쓰고, 백엔드 주소는 코드에 적지 않고 env로만 정해요(`.env.example`).
  - `VITE_BFF_PROXY_TARGET`: 개발 서버 프록시가 `/api`·`/bff`를 보낼 BFF(기본 `http://localhost:8787`). 백엔드 주소는 BFF의 `bff/.env` `BACKEND_URL`(기본 `http://localhost:8080`)이에요.
  - `VITE_API_BASE_URL`: 브라우저가 직접 부를 API 오리진(`/api/v1` 없이). 비우면 같은 오리진으로 보내 프록시를 타요. API 서버가 배포되면 여기에 그 오리진을 넣어요(백엔드 CORS가 열려 있어야 해요).
- API 계약의 기준은 백엔드 `dev` 브랜치의 Swagger(`{백엔드}/v3/api-docs`)예요. 아직 API 서버가 배포 전이라 로컬 서버 기준이에요. `bruno_for_front/`는 dev 기준 요청 예시·오류 케이스·타입 참고용이에요.
- **인증**: 로그인 accessToken(30분)·refreshToken은 메모리 + sessionStorage에 둬요(`shared/api/authToken.ts`). 새로고침해도 유지되고, 탭을 닫으면 다시 로그인해요. 역할·회원 번호는 토큰 payload(`sub`·`roles[]`)에서 읽어요(`app/session.ts`의 `useSession`). 판매자 승인처럼 권한이 바뀌면 새 토큰을 받아야 해요(`reissueSession()`).
  - 토큰이 만료돼 401이 오면(또는 보내기 전에 만료를 알면) `POST /auth/reissue`로 한 번 재발급하고 같은 요청을 다시 보내요(`shared/api/reissue.ts`, 동시 요청은 재발급 1회). 재발급이 안 되거나 만료가 아닌 거절이면 세션을 끝내고 토큰 없이 한 번 더 보내요. 그래도 401이면 `/login?returnTo=`로 보내요.
  - 역할은 서버가 확인해요(SELLER·ADMIN API는 권한이 없으면 403). 임시 `X-Member-*` 헤더는 없어졌어요.
- **쿼리 키**: 키 팩토리는 feature가 갖고, 첫 칸은 `queryKeyPrefix.*`(`shared/api/queryKeys.ts`)예요. 다른 feature의 캐시는 접두어로 무효화해요(`invalidateQueries({ queryKey: [queryKeyPrefix.products] })`).
- **오류**: 모든 오류는 `ApiError{status, detail, fieldErrors}`로 와요. 사용자에게는 `detail`을 보여 줘요.
  - 422 → `useServerFieldErrors(setError, error.fieldErrors)`로 칸에 붙이고 첫 칸에 focus해요.
  - `errors` 없이 오는 필드 오류(예: 가입 409 중복)는 `detail` 문구로 칸을 골라요.
  - 서버에 아직 없는 API는 404 `"No static resource …"`, 아직 막아 둔 기능은 501이 와요. 원문은 화면에 내지 말고 해요체 안내로 바꿔요(예: `features/admin/errors.ts`).
- **업로드**: `useMediaUploads(MediaPurpose.X)`(`shared/ui`)와 `PhotoUploader`를 같이 써요. 제출할 때는 `urls`(다 올린 서버 주소)만 보내고, `uploading`이면 제출을 막아요.
- 실서버 확인은 연결한 백엔드에 curl로 해요. 계정은 `POST /api/v1/members/signup`으로 새로 만들어요(가입하면 BUYER). 남의 데이터는 건드리지 않고, 확인용으로 만든 상품은 지워요.

## BFF

- 결정 근거는 ADR-0006(`docs/private/architecture/decisions/0006-bff-session.md`). 토큰을 브라우저에서 걷어내고, 백엔드가 서비스로 나뉘었을 때 화면용 응답을 합치려고 둬요.
- **지금은 1단계예요**: BFF가 `/api/v1/*`을 경로 그대로 백엔드로 넘기고, 브라우저가 보낸 `Authorization`도 그대로 넘겨요. 그래서 프론트의 토큰 인증(위 '인증')은 바뀌지 않았어요. 토큰 쿠키 세션(`/bff/session/*`)과 합친 응답(`GET /bff/products/:id/detail`)은 만들어 두었지만 프론트는 아직 쓰지 않아요.
  - 1.5단계: 운영 EC2에 BFF를 1단계 그대로 올려요(프론트 변경 없음, ADR-0008).
  - 2단계(1.5단계 뒤, HTTPS #243을 기다리지 않음 — ADR-0009): 프론트를 토큰 쿠키로 바꾸고 `authToken.ts`의 토큰 보관을 걷어내요. 401이면 `POST /bff/session/refresh`를 한 번 부르고 다시 보내요. `TODO(bff-2단계)`를 따라가요. 운영에 BFF가 없을 때 바꾸면 로그인이 깨져요.
- Node 24가 `.ts`를 그대로 실행해요(빌드 단계 없음). 그래서 BFF 코드는 import에 `.ts`를 붙이고 enum·생성자 매개변수 속성처럼 지울 수 없는 문법은 쓰지 않아요(`erasableSyntaxOnly`).
- 백엔드 모듈별 클라이언트 주소는 env로 받아요(`MEMBER_API_URL` 등, 없으면 `BACKEND_URL`). 경로 → 모듈 표는 `bff/src/upstream.ts`예요. 공개 계약 `/api/v1`만 부르고 `/internal`은 쓰지 않아요.
- 세션 저장소는 없어요. 백엔드 토큰을 HttpOnly 쿠키 두 개에 담아요(`bff/src/session/cookie.ts`, ADR-0009): access는 `__Host-paldo_at`(`Path=/`), refresh는 `__Secure-paldo_rt`(`Path=/bff/session`, 재발급 요청에만 실림). 개발(http)은 접두어 없이 `paldo_at`·`paldo_rt`예요.
  - BFF는 `/api` 요청 중에 재발급하지 않아요. 백엔드가 만료로 401을 주면 그대로 돌려주고 프론트가 재발급해요. 같은 refresh로 온 재발급은 한 번만 하고 결과를 10초 기억해요(`refresher.ts`, 여러 탭 대비). BFF가 한 대라 메모리로 충분해요.
  - 로그아웃은 쿠키만 지워요. 백엔드에 logout API가 없어 refresh를 서버에서 끊지 못해요.
  - **Redis 세션 저장소는 만들어 두고 쓰지 않아요**(`session/redis.ts`·`store.ts`·`manager.ts`·`sealed.ts`). BFF가 여러 대가 되거나 서버에서 세션을 끊어야 할 때 되살려요. 다시 만들지 말고 `redis.ts` 맨 위 설명부터 봐요.
- BFF가 내는 오류도 `application/problem+json`이고 `detail`은 해요체예요. 상태를 바꾸는 요청은 `Origin`을 확인해요(`ALLOWED_ORIGINS`, 개발 환경은 localhost 아무 포트). 단, 세션 쿠키 없는 `/api/*`는 보지 않아요(Vercel 미리보기 배포용, ADR-0008).
- 테스트는 `bff/src/**/*.test.ts`(Vitest + `app.request()` + MSW node). 가짜 백엔드는 `bff/src/test/fakeBackend.ts`예요(1회용 refresh·시계 조절, 경로·만료를 지키는 쿠키 저장소 `CookieJar`). 쓰지 않는 Redis 저장소 테스트는 기본 실행에서 빠져 있고 `pnpm --filter @paldo/bff test:redis`로 돌려요(Testcontainers, Docker 필요).
- 프론트가 BFF 코드를 가져올 때는 `import type { AppType } from '@paldo/bff'`만 써요. 패키지가 타입만 내보내서(`exports.types`) 서버 코드가 번들에 들어갈 수 없어요.
- 이미지: `docker build -f bff/Dockerfile .`(컨텍스트는 저장소 루트). `main`에 `bff/`나 의존성 파일이 바뀌어 push되면(또는 수동 실행) `.github/workflows/bff-image.yml`이 GHCR `paldo-gotgan-bff`(`latest`·SHA 7자리)에 올려요. 운영 배치(compose·nginx·`deploy.sh bff`)는 백엔드 레포 `deploy/`에 있어요(ADR-0008).

## API가 없는 곳

- API로 연결된 feature: auth(재발급 포함) · products · cart · checkout(배송비 견적) · wallet(약관·잔액·충전(토스)·이용 내역) · reviews · orders(목록·상세·배송 조회·구매확정) · me(내 정보 조회·수정, 기본 배송지 `/shipments/addresses/default` 조회·저장 — 주문서 처음 값에도 씀) · seller(내 상품·상품 상세·출고 목록·송장·배송지 변경 승인·거절·프로필·잔액·정산 `/payouts/me`) · sellerApply · admin(판매자 심사·정산 조회·실행).
- 아직 연결 전(`NotConnected`)인 곳: me(관심·팔로우·비밀번호·탈퇴·배송지 삭제), farms, 아이디·비밀번호 찾기, orders의 배송지 변경 요청 화면·문의, products의 인기 농가·판매자 정보·관심·팔로우, 비회원 약관, seller의 출고 지연·판매자 취소·클레임·출금·팔로워·홈 주문 집계, admin의 수취인 이름·조정 내역·1건 정산·조정(서버 501).
- **실제 화면은 fixtures를 그리지 않아요.** API가 없는 화면·섹션은 `NotConnected`(`shared/ui`, "아직 연결되지 않은 화면이에요", 개발 서버에선 필요한 API 이름도 표시), 모르는 숫자는 `NotConnectedValue`(–), 서버를 부르지 못하는 버튼은 막고 `DisabledReason reason={NOT_CONNECTED_REASON}`으로 보여 줘요. 토스트만 띄우는 가짜 동작은 만들지 않아요. 비어 보이는 이유가 '데이터 없음'인지 '연결 전'인지 구분되게 하려는 규칙이에요.
  - Biome이 pages·views·components·`app/layouts`에서 fixtures import를 막아요. 화면 상태를 보려면 `previews.tsx`에서 fixtures로 그려요.
- API가 없어 임시로 처리한 곳에는 `TODO(api)` 주석이 있어요(`grep -rn "TODO(api)" src`). API가 생기면 이 주석을 따라 걷어내요.
- 브라우저 저장소에 둔 임시 데이터:
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