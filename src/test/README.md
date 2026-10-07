# test

Vitest 설정(`setup.ts`: jest-dom matchers, MSW `server` 시작·핸들러 리셋·종료. 핸들러 없는 요청은 `onUnhandledFrame: 'error'`로 실패)과 테스트 유틸(providers 래퍼 등). 테스트 안에서는 `server.use(http.get('*/api/...', ...))`로 시나리오별 응답을 덮어쓴다. 테스트 파일은 각 feature 옆에 `*.test.tsx`로 둔다.
