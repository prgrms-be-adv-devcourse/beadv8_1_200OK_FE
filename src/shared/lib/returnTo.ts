// 로그인 뒤 돌아갈 경로. 같은 사이트 안 경로만 허용한다(//evil.com 같은 다른 사이트 주소 막기).

export function loginPath(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(returnTo)}`
}

export function safeReturnTo(value: string | null | undefined, fallback = '/'): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback
  }
  return value
}
