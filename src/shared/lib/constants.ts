// 정책·시안이 정한 상수 (design/DECISIONS.md D). 확정되면 이 파일의 값만 바꾼다.
// ‘가정’은 정책이 아직 없어 시안 값을 임시로 쓴 것이다.

/** 최소 충전 금액 (API: POST /wallets/me/charges 10,000원 이상) */
export const MIN_CHARGE_AMOUNT = 10_000
/** 충전 금액 단위 (API: 10,000원 단위). 지갑 보유 한도는 GET /wallets/me/balance의 maxBalance를 쓴다 */
export const CHARGE_AMOUNT_STEP = 10_000
/** 배송 완료 후 자동 구매확정까지 일수 */
export const AUTO_CONFIRM_DAYS = 3
/** 정산 수수료 (%) */
export const PAYOUT_FEE_RATE = 3
/** 정산 배치가 도는 시각 (가정, 시안 "매일 새벽 2시") */
export const PAYOUT_RUN_HOUR = 2
/** 구매확정 뒤 정산까지 대기 일수 (서버 skip-wait 설명 "정산 대기 기간(15일)") */
export const PAYOUT_HOLD_DAYS = 15
/** 탈퇴 유예 일수 */
export const WITHDRAWAL_GRACE_DAYS = 7
/** 판매자 출금 최소 금액 (가정, C-7) */
export const MIN_WITHDRAWAL_AMOUNT = 10_000
/** 이미지 최대 용량 (MB). 영상은 30MB */
export const MAX_IMAGE_MB = 10
export const MAX_VIDEO_MB = 30
/** 상품 이미지 장수 (API) */
export const PRODUCT_IMAGE_MIN = 1
export const PRODUCT_IMAGE_MAX = 10
/** 판매자 센터 ‘재고 적은 옵션’ 기준 (가정, 시안 5개) */
export const LOW_STOCK_THRESHOLD = 5
/** 상점 소개 글자 수 (가정) */
export const STORE_INTRO_MAX = 200
/** 비밀번호 재설정 링크 유효 시간(분) (가정, C-5) */
export const PASSWORD_RESET_LINK_MINUTES = 30
/** 토스트 유지 시간(ms) */
export const TOAST_DURATION_MS = 4000
/** 한 번에 담을 수 있는 수량 (가정). 장바구니 API에 상한이 없고 재고 수량도 내려주지 않는다(A-7) */
export const MAX_CART_QUANTITY = 99
/** 정산 계좌 은행 (시안). TODO(api): ❌ 정산 계좌 등록 API 없음. 생기면 은행 코드에 맞춘다 */
export const BANKS = [
  '농협은행',
  '국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  '기업은행',
] as const
/** 푸터 사업자 정보·고객센터 (가정, C-14). 값은 모두 자리 표시 */
export const SITE_INFO = {
  companyName: '팔도곳간',
  ceo: '○○○',
  businessNumber: '000-00-00000',
  mailOrderNumber: '제0000-서울○○-0000호',
  address: '서울특별시 ○○구 ○○로 00',
  privacyOfficer: '○○○',
  email: '○○○@○○○.kr',
  csPhone: '0000-0000',
  csHours: '평일 10:00–17:00 · 점심 12:00–13:00',
  csClosed: '주말·공휴일은 쉬어요',
} as const
