import type { FoundId } from './views/FindAccountView'

// 1단계 샘플 데이터 (DECISIONS.md E: 화면끼리 맞게 다시 만든 값)

export const loginFailedMessage = '아이디 또는 비밀번호가 맞지 않아요'

// 정책 ‘a**bc**’: 4글자마다 둘째·셋째 글자를 가린다 (seoyeon88 → s**ye**88)
export const foundId: FoundId = { maskedLoginId: 's**ye**88', joinedAt: '2026-03-14T10:00:00' }

export const maskedEmail = 'se********@example.com'

export const RESEND_WAIT_SECONDS = 60
