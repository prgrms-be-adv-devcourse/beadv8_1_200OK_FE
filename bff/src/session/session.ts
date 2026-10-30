// 백엔드 로그인·재발급 응답. access 30분, refresh 14일이고 refresh는 한 번 쓰면 바뀐다
export type TokenResponse = {
  tokenType: 'Bearer'
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
}

/** 백엔드 토큰과 거기서 읽은 회원 정보. 토큰은 HttpOnly 쿠키로만 브라우저에 둔다(응답 본문에는 싣지 않는다) */
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

// 서명 검증은 백엔드가 한다. BFF는 토큰에서 회원 번호와 역할만 읽는다.
// 쿠키로 받은 토큰은 검증하지 않은 값이라 화면 표시에만 쓴다. 권한은 백엔드가 API마다 확인한다
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

/** 쿠키로 받은 access에서 회원 정보를 읽는다. 브라우저가 보낸 값이라 형식이 틀리면 null */
export function viewOfAccessToken(accessToken: string): SessionView | null {
  try {
    return readClaims(accessToken)
  } catch {
    return null
  }
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
