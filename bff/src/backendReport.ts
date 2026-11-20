import * as Sentry from '@sentry/hono/node'
import type { UpstreamModule } from './config.ts'

// 백엔드에는 Sentry가 없다. BFF는 백엔드 5xx를 정상 응답처럼 그대로 넘기므로
// 여기서 이슈로 올리지 않으면 백엔드 장애가 Sentry에 남지 않는다 (#49).
// 백엔드가 응답마다 주는 X-Trace-Id(백엔드 TraceFilter)를 붙여 이슈에서 백엔드 로그로 바로 찾아간다.
// 연결 실패(UpstreamError)는 응답이 없어 여기 오지 않고, sentry() 미들웨어가 한 번 보고한다

export const TRACE_ID_HEADER = 'X-Trace-Id'

/** 보고에 넣는 것은 이 다섯 칸뿐이다. Authorization·쿠키·요청 본문은 넣지 않는다 */
export type BackendFailure = {
  /** 모듈 표(upstream.ts)에 없는 경로는 'backend' */
  module: UpstreamModule | 'backend'
  /** routeName()으로 정규화한 '메서드 경로' */
  route: string
  status: number
  traceId: string | null
  /** 백엔드 problem의 detail. 본문이 problem이 아니면 null */
  detail: string | null
}

/** createApp이 주입받는다. 테스트는 가짜를 넣어 무엇이 불렸는지 본다 */
export type BackendReport = {
  /** 백엔드 응답에 X-Trace-Id가 있을 때마다 */
  traceId(traceId: string): void
  /** 백엔드가 5xx를 줬을 때 한 번 */
  serverError(failure: BackendFailure): void
}

/**
 * 이슈 제목이 `BackendServerError: Backend 500 GET /api/v1/orders/:id`로 읽히게 하는 이름표.
 * captureMessage로 보내면 SDK가 붙인 스택 때문에 제목이 함수 이름(`Object.serverError`)이 된다
 */
export class BackendServerError extends Error {
  override name = 'BackendServerError'
}

/** 같은 [모듈, 경로, 상태]는 한 이슈로 묶는다. traceId·detail은 이벤트마다 달라 묶는 기준에서 뺀다 */
export function backendIssue(failure: BackendFailure) {
  const tags: Record<string, string | number> = {
    'backend.module': failure.module,
    'backend.route': failure.route,
    'backend.status': failure.status,
  }
  if (failure.traceId) tags['backend.trace_id'] = failure.traceId
  return {
    message: `Backend ${failure.status} ${failure.route}`,
    context: {
      level: 'error' as const,
      fingerprint: [failure.module, failure.route, String(failure.status)],
      tags,
      contexts: { backend: { ...failure } },
    },
  }
}

export const sentryBackendReport: BackendReport = {
  traceId(traceId) {
    // 요청 하나의 트랜잭션(루트 span)에 남겨 트레이스 검색으로 찾게 한다.
    // 상세 라우트처럼 백엔드를 여러 번 부르면 마지막 응답의 값이 남는다
    const span = Sentry.getActiveSpan()
    if (span) Sentry.getRootSpan(span).setAttribute('backend.trace_id', traceId)
  },
  serverError(failure) {
    const { message, context } = backendIssue(failure)
    Sentry.captureException(new BackendServerError(message), context)
  },
}
