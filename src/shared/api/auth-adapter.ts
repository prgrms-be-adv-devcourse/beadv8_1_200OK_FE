import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

/**
 * 인증 전달 방식 교체 슬롯(ADR-0004).
 * 백엔드가 세션 방식을 확정하면 이 인터페이스 구현 1개와 features/auth만 바꾼다.
 */
export interface AuthAdapter {
  /** 요청 전송 전 호출. 토큰 방식이면 Authorization 헤더를 붙인다. */
  attach(
    config: InternalAxiosRequestConfig,
  ): InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>
  /**
   * 401 응답 시 호출. 복구 가능하면(refresh 성공) retry()로 원 요청을 1회 재시도해 그 결과를 돌려준다.
   * 복구 불가면 error를 그대로 throw한다. 그러면 client가 onUnauthorized 핸들러를 호출한다.
   * refresh 요청 자체는 skipAuthRetry: true로 보내 재귀를 막는다.
   */
  handleUnauthorized(error: AxiosError, retry: () => Promise<AxiosResponse>): Promise<AxiosResponse>
}

/** 기준안: HttpOnly 쿠키 세션. 아무것도 붙이지 않고 401을 그대로 전달한다. */
export const cookieAuthAdapter: AuthAdapter = {
  attach: (config) => config,
  handleUnauthorized: (error) => Promise.reject(error),
}

let currentAdapter: AuthAdapter = cookieAuthAdapter

export function setAuthAdapter(adapter: AuthAdapter): void {
  currentAdapter = adapter
}

export function getAuthAdapter(): AuthAdapter {
  return currentAdapter
}
