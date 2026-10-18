import { WithdrawReason } from './types'

export const withdrawReasonLabels: Record<WithdrawReason, string> = {
  [WithdrawReason.RARELY_USED]: '자주 이용하지 않아요',
  [WithdrawReason.NO_PRODUCT]: '원하는 상품이 없어요',
  [WithdrawReason.PRICE]: '가격이 맞지 않아요',
  [WithdrawReason.ETC]: '기타',
}
