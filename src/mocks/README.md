# mocks

MSW 핸들러와 더미 데이터. **Vitest 테스트 전용**이다. 개발 서버는 실제 백엔드 API를 사용하므로 브라우저 워커(`public/mockServiceWorker.js`)는 두지 않는다.

- `server.ts` — `setupServer(...handlers)` (`msw/node`, `src/test/setup.ts`에서 시작)
- `handlers/` — feature별 핸들러. 401 응답, 결제 승인 재호출, 재고 부족 같은 실패 시나리오 재현용

브라우저 목이 다시 필요해지면 `npx msw init public --save`로 워커를 생성하고 `biome.json`의 `public` 제외 설정을 확인한다.
