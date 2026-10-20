import { HttpResponse } from 'msw'

// 핸들러 공통 도우미. 서버 응답 모양(ProblemDetail · 페이지)을 한 곳에서 맞춘다.

/** application/problem+json 오류 응답 */
export const problem = (status: number, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/x', ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

/** 서버 페이지 응답 {content, page, size, totalElements, totalPages} */
export const pageOf = <T>(all: T[], searchParams: URLSearchParams, defaultSize = 20) => {
  const page = Number(searchParams.get('page') ?? 0)
  const size = Number(searchParams.get('size') ?? defaultSize)
  return {
    content: all.slice(page * size, page * size + size),
    page,
    size,
    totalElements: all.length,
    totalPages: Math.ceil(all.length / size),
  }
}
