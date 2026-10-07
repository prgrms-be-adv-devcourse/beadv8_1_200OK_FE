import type { ApiError } from './error'

/**
 * 401 이벤트. features/auth의 registerAuthHandlers가 구독해 queryClient.clear()와
 * /login?returnTo= 이동을 수행한다(ADR-0004). shared는 라우터를 모르므로 여기서는 알리기만 한다.
 */
export type UnauthorizedHandler = (error: ApiError) => void

const handlers = new Set<UnauthorizedHandler>()

/** 핸들러를 등록하고 해제 함수를 돌려준다. */
export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

/** client 내부용. 어댑터가 401을 복구하지 못했을 때 1회 호출된다. */
export function emitUnauthorized(error: ApiError): void {
  for (const handler of handlers) {
    handler(error)
  }
}
