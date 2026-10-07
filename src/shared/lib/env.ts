// 환경변수 접근 지점. VITE_ 접두어 변수는 번들에 노출되므로 공개 가능한 값만 둔다(ADR-0005).
// 테스트·로컬에서 값이 없으면 동일 출처 '/api'로 폴백한다.

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  pgClientKey: import.meta.env.VITE_PG_CLIENT_KEY || '',
} as const
