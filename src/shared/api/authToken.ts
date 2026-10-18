import { MemberRole } from './types'

// 로그인 토큰 보관 (ADR-0004 토큰 방식, DECISIONS.md A-12). accessToken은 메모리에만 둔다.
// localStorage·URL·로그에 남기지 않으므로 새로고침하면 다시 로그인한다(refresh API 없음, refreshToken은 버린다).
// 내 정보 API가 없어 역할·회원 번호는 토큰 payload(sub · role · exp)에서 읽는다. 표시용일 뿐이고 인가는 서버가 한다.

export type AuthSession = {
  accessToken: string
  memberId: number
  role: MemberRole
  /** 만료 시각 (ms) */
  expiresAt: number
}

/** 세션이 끝난 이유. expired = 만료되거나 서버가 토큰을 거절함(401) */
export type SessionEndReason = 'logout' | 'expired'

let current: AuthSession | null = null
let expiryTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const endListeners = new Set<(reason: SessionEndReason) => void>()

// setTimeout 최댓값(약 24.8일)을 넘으면 바로 실행되므로 자른다
const MAX_TIMEOUT = 2 ** 31 - 1

function decodeBase64Url(part: string): string {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

const isRole = (value: unknown): value is MemberRole =>
  Object.values(MemberRole).includes(value as MemberRole)

/** 토큰 payload를 읽는다. 서명은 확인하지 않는다(서버 몫). 모양이 다르면 null */
export function readTokenClaims(
  token: string,
): Pick<AuthSession, 'memberId' | 'role' | 'expiresAt'> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const claims: unknown = JSON.parse(decodeBase64Url(payload))
    if (typeof claims !== 'object' || claims === null) return null
    const { sub, role, exp } = claims as Record<string, unknown>
    const memberId = Number(sub)
    if (!Number.isInteger(memberId) || !isRole(role) || typeof exp !== 'number') return null
    return { memberId, role, expiresAt: exp * 1000 }
  } catch {
    return null
  }
}

function emit() {
  for (const listener of listeners) listener()
}

/** 로그인 응답의 accessToken을 보관한다. 읽을 수 없거나 이미 만료된 토큰이면 오류 */
export function setAccessToken(token: string): AuthSession {
  const claims = readTokenClaims(token)
  if (!claims || claims.expiresAt <= Date.now()) {
    throw new Error('로그인 정보를 읽지 못했어요. 다시 로그인해 주세요')
  }
  clearTimeout(expiryTimer)
  current = { accessToken: token, ...claims }
  expiryTimer = setTimeout(
    () => clearAccessToken('expired'),
    Math.min(claims.expiresAt - Date.now(), MAX_TIMEOUT),
  )
  emit()
  return current
}

export function clearAccessToken(reason: SessionEndReason = 'logout') {
  clearTimeout(expiryTimer)
  if (!current) return
  current = null
  emit()
  for (const listener of endListeners) listener(reason)
}

/** 지금 세션. 같은 세션이면 같은 객체를 돌려준다(useSyncExternalStore 스냅샷) */
export function getAuthSession(): AuthSession | null {
  return current
}

/** 요청 직전에 부른다. 잠자기 등으로 타이머가 늦었으면 여기서 만료 처리한다 */
export function getFreshAuthSession(): AuthSession | null {
  if (current && current.expiresAt <= Date.now()) clearAccessToken('expired')
  return current
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 세션이 끝날 때(로그아웃 · 만료 · 401). 사용자별 캐시 정리에 쓴다 */
export function onSessionEnd(listener: (reason: SessionEndReason) => void): () => void {
  endListeners.add(listener)
  return () => endListeners.delete(listener)
}
