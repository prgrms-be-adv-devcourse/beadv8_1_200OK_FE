// 백엔드 로그인·재발급 응답. access 30분, refresh 14일이고 refresh는 한 번 쓰면 바뀐다
export type TokenResponse = {
  tokenType: 'Bearer'
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
}

/** BFF 세션 저장소에만 있는 값. 토큰은 브라우저로 보내지 않는다 */
export type Session = {
  memberId: number
  roles: string[]
  accessToken: string
  accessTokenExpiresAt: number
  refreshToken: string
  refreshTokenExpiresAt: number
}

/** 브라우저가 받는 세션 정보 */
export type SessionView = { memberId: number; roles: string[] }

export const toSessionView = (session: Session): SessionView => ({
  memberId: session.memberId,
  roles: session.roles,
})

// 서명 검증은 백엔드가 한다. BFF는 방금 백엔드에게 받은 토큰에서 회원 번호와 역할만 읽는다
function readClaims(accessToken: string): { memberId: number; roles: string[] } {
  const payload = accessToken.split('.')[1]
  if (!payload) throw new Error('access 토큰 형식이 아니다')
  const claims: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (typeof claims !== 'object' || claims === null) throw new Error('access 토큰 payload가 없다')
  const memberId = Number('sub' in claims ? claims.sub : Number.NaN)
  const roles = 'roles' in claims && Array.isArray(claims.roles) ? claims.roles : []
  if (!Number.isInteger(memberId)) throw new Error('access 토큰에 회원 번호(sub)가 없다')
  return { memberId, roles: roles.filter((role): role is string => typeof role === 'string') }
}

export function sessionFromTokens(tokens: TokenResponse): Session {
  return {
    ...readClaims(tokens.accessToken),
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: Date.parse(tokens.accessTokenExpiresAt),
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresAt: Date.parse(tokens.refreshTokenExpiresAt),
  }
}
