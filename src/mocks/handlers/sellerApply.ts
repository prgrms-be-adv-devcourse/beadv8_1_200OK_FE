import { HttpResponse, http } from 'msw'
import { applicationDetail } from '@/features/sellerApply/fixtures'
import { problem } from './_shared'

// 판매자 신청 기본 응답: 신청한 적 없음(빈 목록). 진행 중인 신청·409·422는 테스트에서 server.use(...)로 덮는다.

export const sellerApplyHandlers = [
  http.get('*/api/v1/sellers/me/applications', () => HttpResponse.json({ applications: [] })),
  http.get('*/api/v1/sellers/me/applications/:applicationId', ({ params }) =>
    Number(params.applicationId) === applicationDetail.applicationId
      ? HttpResponse.json(applicationDetail)
      : problem(404, '판매자 신청을 찾을 수 없습니다.'),
  ),
  http.post('*/api/v1/sellers/me/applications', () =>
    HttpResponse.json({ applicationId: applicationDetail.applicationId }, { status: 201 }),
  ),
]
