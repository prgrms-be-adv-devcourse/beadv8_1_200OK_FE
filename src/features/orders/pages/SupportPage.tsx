import { useParams } from 'react-router'
import { SupportNotConnectedView } from '../views/SupportView'

// 고객센터 문의 라우트 /orders/:orderId/inquiry (주문 상세에서 링크하지 않는다).
// API가 없어 ‘연결 전’만 보여 준다(가짜 접수 완료를 보여 주지 않는다). 폼·내역 화면은 /__design에서 본다.
// TODO(api): 📝 문의 접수·내역 API. 사진은 미디어 업로드(용도 미정)

export function SupportPage() {
  const { orderId } = useParams()
  return <SupportNotConnectedView orderId={Number(orderId)} />
}
