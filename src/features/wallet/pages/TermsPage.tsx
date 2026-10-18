import { useNavigate, useParams } from 'react-router'
import { TermsType } from '@/shared/api/types'
import { walletTerms } from '../fixtures'
import { TermsView } from '../views/TermsView'

// 약관 보기 라우트 /terms/:type (type = TermsType 값). 1단계: fixtures로 그린다.
// TODO(api): GET /api/v1/wallets/me/terms는 로그인(🔐)이 필요하다. 비회원이 가입 화면에서 ‘보기’를 누를 때 볼 방법은 백엔드와 정해야 한다.

export function TermsPage() {
  const { type } = useParams()
  const navigate = useNavigate()
  const selected = Object.values(TermsType).find((value) => value === type)

  return (
    <TermsView
      status="success"
      terms={walletTerms}
      selectedType={selected ?? TermsType.ELECTRONIC_FINANCIAL_TRANSACTION}
      onBack={() => navigate(-1)}
    />
  )
}
