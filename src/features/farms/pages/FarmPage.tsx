import { FarmStoreView } from '../views/FarmStoreView'

// B-11 판매자 상점 라우트 /farms/:farmId.
// 상점 정보·판매자별 상품 목록 API가 없어 ‘연결 전’ 화면만 보여 준다(가짜 데이터·가짜 팔로우를 그리지 않는다).
// TODO(api): 📝 GET /sellers/{sellerId}, ❌ 판매자별 상품 목록(GET /products에 sellerId 없음),
//   📝 팔로우 PUT/DELETE /members/me/followings/{sellerId}, ❌ 내 판매자 ID(내 상점 여부, A-12)

export function FarmPage() {
  return <FarmStoreView status="notConnected" />
}
