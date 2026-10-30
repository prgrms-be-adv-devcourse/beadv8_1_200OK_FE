import { FindAccountNotConnectedView } from '../views/FindAccountView'

// 아이디·비밀번호 찾기 라우트 /find-account?tab=id|password.
// API가 없어 ‘연결 전’ 화면만 보여 준다. 폼·결과 화면(FindAccountView)은 /__design에서 본다.
// TODO(api): ❌ 아이디 찾기·재설정 링크 보내기 API 없음(C-5). 생기면 FindAccountView를 연결한다

export function FindAccountPage() {
  return <FindAccountNotConnectedView />
}
