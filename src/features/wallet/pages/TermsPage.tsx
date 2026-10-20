import { useSyncExternalStore } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import { TermsType } from '@/shared/api/types'
import { loginPath } from '@/shared/lib/returnTo'
import { termsErrorMessage, useWalletTerms } from '../queries'
import { TermsView } from '../views/TermsView'

// 약관 보기 라우트 /terms/:type (type = TermsType 값). 로그인했으면 GET /wallets/me/terms(현재 버전)로 그린다.
// TODO(api): 📝 약관 조회는 로그인(🔐)이 필요하다. 비회원(가입 화면의 ‘보기’)은 본문 대신 로그인 안내를 보인다
//   — 공개 약관 API를 백엔드와 정해야 한다.

export function TermsPage() {
  const { type } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const loggedIn = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession) !== null
  const terms = useWalletTerms(loggedIn)
  const selected = Object.values(TermsType).find((value) => value === type)

  return (
    <TermsView
      status={loggedIn ? terms.status : 'loginRequired'}
      terms={loggedIn ? (terms.data ?? []) : []}
      selectedType={selected ?? TermsType.ELECTRONIC_FINANCIAL_TRANSACTION}
      loginTo={loginPath(`${location.pathname}${location.search}`)}
      errorMessage={terms.isError ? termsErrorMessage(terms.error) : undefined}
      onRetry={() => terms.refetch()}
      onBack={() => navigate(-1)}
    />
  )
}
