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
nvm use                  # .nvmrc의 Node 24 LTS. Node 23·24.15 미만은 jsdom·react-router가 지원하지 않음
corepack enable pnpm     # 처음 한 번. package.json의 packageManager(pnpm 12) 버전을 그대로 씀
cp .env.example .env     # 환경변수
pnpm install
pnpm dev
```

패키지 매니저는 **pnpm**이에요(`pnpm-lock.yaml`). 패키지 추가는 `pnpm add <패키지>`(개발용 `-D`), 일회성 실행은 `pnpm dlx`.
pnpm은 나온 지 24시간이 안 된 버전을 바로 설치하지 않아요(공급망 보호). 꼭 필요하면 `pnpm-workspace.yaml`의 `minimumReleaseAgeExclude`에 그 버전을 적어요(lock을 새로 만들 때 pnpm이 자동으로 넣기도 해요).

| 스크립트 | 설명 |
| --- | --- |
| `pnpm dev` / `build` / `preview` | Vite 개발 서버 / 프로덕션 빌드(`tsc -b` 포함) / 빌드 미리보기 |
| `pnpm check` / `check:fix` | Biome lint + format 검사 / 자동 수정 |
| `pnpm typecheck` | TypeScript 프로젝트 참조 빌드 |
| `pnpm test` / `test:watch` | Vitest |

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
