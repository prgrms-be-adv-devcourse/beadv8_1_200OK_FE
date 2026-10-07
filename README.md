# 농가 직거래 마켓 — Frontend

소규모 농가가 농산물·식물을 직접 판매하는 직거래 마켓의 웹 프론트엔드.

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| UI | React 19, TypeScript 6, Vite 8 |
| 라우팅 | React Router 8 (data mode, `react-router` + `react-router/dom`) |
| 서버 상태 | TanStack Query 5 |
| 클라이언트 상태 | Zustand 5 (체크아웃 초안·전역 UI만) |
| HTTP | Axios |
| 폼·검증 | React Hook Form + Zod 4 (`@hookform/resolvers`) |
| UI 컴포넌트 | Mantine 9 + CSS Modules (postcss-preset-mantine) |
| 품질 | Biome 2 (lint + format), Vitest 5 + Testing Library, MSW 3 (테스트 전용) |

## 시작하기

```bash
cp .env.example .env     # 환경변수
npm install              # .npmrc의 legacy-peer-deps=true 적용 (npm 10.9 peer 해석 버그 우회)
npm run dev
```

| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` / `build` / `preview` | Vite 개발 서버 / 프로덕션 빌드(`tsc -b` 포함) / 빌드 미리보기 |
| `npm run check` / `check:fix` | Biome lint + format 검사 / 자동 수정 |
| `npm run typecheck` | TypeScript 프로젝트 참조 빌드 |
| `npm run test` / `test:watch` | Vitest |

## 디렉토리 구조와 의존 방향

```
src/
  app/        진입·providers·router·layouts·guards        (features, shared import 가능)
  features/   auth products farms cart checkout orders seller  (shared만 import, feature 간 금지)
  shared/     api ui lib styles                            (아무것도 import 안 함)
  mocks/      MSW 핸들러 (Vitest 테스트 전용)
  test/       Vitest setup·유틸
```

- 의존 방향은 `app → features → shared` 단방향이며 Biome `noRestrictedImports`로 검사한다.
- 각 feature는 `index.ts`로 pages·hooks·guards만 공개한다. `api.ts`·`queries.ts`·`schemas.ts`·`store.ts`·`components/`는 외부 import 금지.
- 예외: `products → cart` (상품 상세의 담기). 그 외 공유가 필요하면 `shared`로 승격.
- 각 폴더의 `CLAUDE.md`에 책임이 적혀 있다.
