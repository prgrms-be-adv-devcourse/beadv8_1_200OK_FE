import { ResetPasswordNotConnectedView } from '../views/ResetPasswordView'

// 새 비밀번호 정하기 라우트 /find-account/reset?token=.
// API가 없어 ‘연결 전’ 화면만 보여 준다. 폼·완료·만료 화면(ResetPasswordView)은 /__design에서 본다.
// TODO(api): ❌ 재설정 토큰 확인·비밀번호 변경 API 없음(C-5). 생기면 ResetPasswordView를 연결한다

export function ResetPasswordPage() {
  return <ResetPasswordNotConnectedView />
}
