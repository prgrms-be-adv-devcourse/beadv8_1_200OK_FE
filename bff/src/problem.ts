// BFF가 직접 내는 오류도 백엔드와 같은 application/problem+json으로 보낸다.
// 그래야 프론트 toApiError가 출처를 가리지 않고 detail을 보여 준다 (ADR-0006)

const titles: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

export function problem(status: number, detail: string, instance: string): Response {
  const body = { type: 'about:blank', title: titles[status] ?? 'Error', status, detail, instance }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

export const problemDetail = {
  loginRequired: '로그인이 필요해요',
  forbiddenOrigin: '허용되지 않은 곳에서 보낸 요청이에요. 페이지를 새로 고친 뒤 다시 시도해 주세요',
  upstreamUnreachable: '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요',
  upstreamTimeout: '서버 응답이 늦어지고 있어요. 잠시 뒤 다시 시도해 주세요',
  sessionUnavailable: '로그인 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요',
  notFound: '찾는 정보가 없어요',
  internal: '서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요',
} as const

/** 백엔드가 준 problem의 detail. 본문이 problem이 아니면 null */
export async function readProblemDetail(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      return typeof body.detail === 'string' ? body.detail : null
    }
    return null
  } catch {
    return null
  }
}
