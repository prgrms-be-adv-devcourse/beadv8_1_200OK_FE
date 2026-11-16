import { z } from 'zod'

// 출고지 우편번호 검증. ✅ SellerApplyRequest·SellerProfileRequest의 originPostalCode: 필수, 숫자 5자리(\d{5}).
// 판매자 신청(sellerApply)과 상점 프로필(seller)이 같이 쓴다.

export const postalCodeSchema = z
  .string()
  .trim()
  .min(1, '출고지 우편번호를 입력해 주세요')
  .regex(/^\d{5}$/, '우편번호는 숫자 5자리로 입력해 주세요')
