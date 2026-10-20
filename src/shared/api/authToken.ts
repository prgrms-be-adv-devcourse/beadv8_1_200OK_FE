import { MemberRole } from './types'

// 로그인 토큰 보관 (ADR-0004 토큰 방식, DECISIONS.md A-12).
// accessToken·refreshToken은 메모리 + sessionStorage(2026-10-20 팀 결정: 새로고침해도 로그인 유지, 탭을 닫으면 지워짐).
// 저장소를 못 쓰면 메모리에만 둔다. URL·로그에는 남기지 않는다.
// refreshToken은 한 번만 쓸 수 있다(서버). 재발급(reissue.ts)하면 두 토큰을 모두 새것으로 바꾼다.
// 만료 정책: refreshToken이 있으면 access가 만료돼도 세션을 끝내지 않고, 다음 요청 때 client.ts가 재발급한다.
//   refreshToken이 없을 때만 만료 시각에 세션을 끝낸다.
// 내 정보 API가 없어 역할·회원 번호는 토큰 payload(sub · roles · exp)에서 읽는다. 표시용일 뿐이고 인가는 서버가 한다.
// 역할은 roles 배열로 온다(BUYER, SELLER는 BUYER와 함께, ADMIN은 단독). 이전 형식 role 문자열도 읽는다. 여럿이면 ADMIN > SELLER > BUYER.

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
let refreshToken: string | null = null
let expiryTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const endListeners = new Set<(reason: SessionEndReason) => void>()

// setTimeout 최댓값(약 24.8일)을 넘으면 바로 실행되므로 자른다
const MAX_TIMEOUT = 2 ** 31 - 1

const STORAGE_KEY = 'paldo.auth.accessToken'
const REFRESH_STORAGE_KEY = 'paldo.auth.refreshToken'

// 사생활 보호 모드 등에서 저장소 접근이 막혀도 로그인은 메모리로 동작해야 한다
function persist(key: string, value: string | null) {
  try {
    if (value) sessionStorage.setItem(key, value)
    else sessionStorage.removeItem(key)
  } catch {}
}

function readStored(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function decodeBase64Url(part: string): string {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

const isRole = (value: unknown): value is MemberRole =>
  Object.values(MemberRole).includes(value as MemberRole)

const ROLE_PRIORITY = [MemberRole.ADMIN, MemberRole.SELLER, MemberRole.BUYER]

function roleOf(claims: Record<string, unknown>): MemberRole | null {
  const roles = Array.isArray(claims.roles) ? claims.roles.filter(isRole) : []
  if (isRole(claims.role)) roles.push(claims.role)
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null
}

/** 토큰 payload를 읽는다. 서명은 확인하지 않는다(서버 몫). 모양이 다르면 null */
export function readTokenClaims(
  token: string,
): Pick<AuthSession, 'memberId' | 'role' | 'expiresAt'> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const claims: unknown = JSON.parse(decodeBase64Url(payload))
    if (typeof claims !== 'object' || claims === null) return null
    const { sub, exp } = claims as Record<string, unknown>
    const memberId = Number(sub)
    const role = roleOf(claims as Record<string, unknown>)
    if (!Number.isInteger(memberId) || !role || typeof exp !== 'number') return null
    return { memberId, role, expiresAt: exp * 1000 }
  } catch {
    return null
  }
}

function emit() {
  for (const listener of listeners) listener()
}

/** access 만료 여부. skew만큼 일찍 만료로 본다(요청이 서버에 닿을 때 이미 만료된 토큰을 보내지 않도록) */
export function isSessionExpired(session: AuthSession, skewMs = 5_000): boolean {
  return session.expiresAt - skewMs <= Date.now()
}

/**
 * 로그인·재발급 응답의 토큰을 보관한다. 읽을 수 없거나 이미 만료된 accessToken이면 오류.
 * refresh를 생략하면 갖고 있던 refreshToken을 그대로 둔다(테스트·만료 전 재설정용).
 */
export function setAccessToken(token: string, refresh?: string | null): AuthSession {
  const claims = readTokenClaims(token)
  if (!claims || claims.expiresAt <= Date.now()) {
    throw new Error('로그인 정보를 읽지 못했어요. 다시 로그인해 주세요')
  }
  if (refresh !== undefined) setRefreshToken(refresh)
  start(token, claims)
  persist(STORAGE_KEY, token)
  emit()
  return current as AuthSession
}

function setRefreshToken(value: string | null) {
  refreshToken = value
  persist(REFRESH_STORAGE_KEY, value)
}

/** 재발급에 쓸 refreshToken. 없으면 null(만료 시 바로 로그아웃) */
export function getRefreshToken(): string | null {
  return refreshToken
}

function start(token: string, claims: NonNullable<ReturnType<typeof readTokenClaims>>) {
  clearTimeout(expiryTimer)
  current = { accessToken: token, ...claims }
  // refreshToken이 있으면 만료돼도 재발급으로 이어 가므로 타이머를 걸지 않는다
  if (!refreshToken) {
    expiryTimer = setTimeout(
      () => clearAccessToken('expired'),
      Math.min(claims.expiresAt - Date.now(), MAX_TIMEOUT),
    )
  }
}

/** 앱을 열 때 저장해 둔 토큰으로 세션을 되살린다. 읽을 수 없으면 지운다. access가 만료돼도 refresh가 있으면 살린다 */
export function restoreAccessToken(): AuthSession | null {
  const token = readStored(STORAGE_KEY)
  refreshToken = readStored(REFRESH_STORAGE_KEY)
  if (!token) {
    setRefreshToken(null)
    return null
  }
  const claims = readTokenClaims(token)
  if (!claims || (claims.expiresAt <= Date.now() && !refreshToken)) {
    persist(STORAGE_KEY, null)
    setRefreshToken(null)
    return null
  }
  start(token, claims)
  emit()
  return current
}

export function clearAccessToken(reason: SessionEndReason = 'logout') {
  clearTimeout(expiryTimer)
  persist(STORAGE_KEY, null)
  setRefreshToken(null)
  if (!current) return
  current = null
  emit()
  for (const listener of endListeners) listener(reason)
}

/** 지금 세션. 같은 세션이면 같은 객체를 돌려준다(useSyncExternalStore 스냅샷) */
export function getAuthSession(): AuthSession | null {
  return current
}

/**
 * 요청 직전에 부른다. 만료됐는데 refreshToken이 없으면 여기서 세션을 끝낸다.
 * refreshToken이 있으면 만료된 세션을 그대로 돌려주고, client.ts가 재발급한다.
 */
export function getFreshAuthSession(): AuthSession | null {
  if (current && current.expiresAt <= Date.now() && !refreshToken) clearAccessToken('expired')
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
