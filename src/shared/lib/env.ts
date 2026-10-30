// 환경변수 (.env.example). 공개해도 되는 값만 둔다.

/**
 * API 오리진. 비우면 같은 오리진(상대 경로)으로 보내고, 개발 서버는 vite.config의 /api 프록시가 받는다.
 * 요청 경로는 Bruno 그대로 `/api/v1/...`
 */
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/** 토스페이먼츠 클라이언트 키 (예치금 충전 결제창) */
export const pgClientKey = import.meta.env.VITE_PG_CLIENT_KEY ?? ''
