import { HttpResponse, http } from 'msw'
import { MemberRole } from '@/shared/api/types'
import { fakeToken } from '@/test/token'

// 로그인·재발급·로그아웃 기본 응답. 토큰은 서명 없는 가짜(fakeToken). 실패(401·403)는 테스트에서 덮는다.

let reissueCount = 0

const tokens = (role: MemberRole, memberId: number, refresh: string) => ({
  tokenType: 'Bearer',
  accessToken: fakeToken({ role, memberId }),
  accessTokenExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  refreshToken: refresh,
  refreshTokenExpiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
})

export const authHandlers = [
  http.post('*/api/v1/auth/login', () =>
    HttpResponse.json(tokens(MemberRole.BUYER, 2, 'refresh-1')),
  ),
  http.post('*/api/v1/auth/reissue', () => {
    reissueCount += 1
    return HttpResponse.json(tokens(MemberRole.BUYER, 2, `refresh-${reissueCount + 1}`))
  }),
  // 로그아웃은 없는·만료된 토큰에도 204(멱등)
  http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
  http.post('*/api/v1/members/signup', () => HttpResponse.json({ memberId: 2 }, { status: 201 })),
]
