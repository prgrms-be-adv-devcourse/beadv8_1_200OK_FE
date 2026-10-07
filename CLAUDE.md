# CLAUDE.md

농가 직거래 마켓 프론트엔드. React 19 + TypeScript + Vite 8 CSR SPA.

## 명령어

```bash
npm run dev        # 개발 서버
npm run check      # Biome lint + format 검사 (커밋 전 필수)
npm run check:fix  # Biome 자동 수정
npm run typecheck  # tsc -b
npm run test       # Vitest
npm run build      # tsc -b && vite build
```

## 규칙

- 의존 방향은 `app → features → shared` 단방향. feature 간 import 금지, 다른 feature는 `index.ts` 공개 계약만 사용 (ADR-0003). Biome이 위반을 error로 잡는다.
- `src/mocks/`는 테스트에서만 import한다.
- 코드 스타일은 Biome 설정을 따른다. 작은따옴표, 세미콜론 생략, 2칸 들여쓰기, 100자.
- 서버 상태는 TanStack Query, 클라이언트 상태는 Zustand(체크아웃 초안·전역 UI만) (ADR-0002).
- 시크릿 키는 `.env`에 넣지 않는다. `VITE_` 접두어 변수는 번들에 노출된다 (ADR-0005).
- 주석·문서·커밋 메시지는 한국어로 작성한다.

