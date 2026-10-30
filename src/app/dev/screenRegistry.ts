import { adminPreviews } from '@/features/admin/previews'
import { authPreviews } from '@/features/auth/previews'
import { cartPreviews } from '@/features/cart/previews'
import { checkoutPreviews } from '@/features/checkout/previews'
import { farmPreviews } from '@/features/farms/previews'
import { mePreviews } from '@/features/me/previews'
import { orderPreviews } from '@/features/orders/previews'
import { productPreviews } from '@/features/products/previews'
import { reviewPreviews } from '@/features/reviews/previews'
import {
  sellerCenterPreviews,
  sellerMoneyPreviews,
  sellerWorkPreviews,
} from '@/features/seller/previews'
import { sellerApplyPreviews } from '@/features/sellerApply/previews'
import { chargePreviews, walletHistoryPreviews, walletPreviews } from '@/features/wallet/previews'
import type { ScreenPreview } from '@/shared/lib/screenPreview'

// 1단계 화면 묶음(design/PLAN.md 1-1 ~ 1-10)별 상태 미리보기. 묶음을 만들면 여기에 더한다.

export type ScreenBundle = { id: string; title: string; screens: ScreenPreview[] }

export const screenBundles: ScreenBundle[] = [
  {
    id: 'screens-1-1',
    title: '1-1 둘러보기 · 상품',
    screens: [...productPreviews, ...farmPreviews],
  },
  { id: 'screens-1-2', title: '1-2 회원 · 인증', screens: [...authPreviews, ...walletPreviews] },
  {
    id: 'screens-1-3',
    title: '1-3 구매 · 결제',
    screens: [...cartPreviews, ...checkoutPreviews, ...chargePreviews],
  },
  { id: 'screens-1-4', title: '1-4 주문 이후', screens: [...orderPreviews, ...reviewPreviews] },
  {
    id: 'screens-1-5',
    title: '1-5 마이페이지',
    screens: [mePreviews[0], ...walletHistoryPreviews, ...mePreviews.slice(1)].filter(
      (screen): screen is ScreenPreview => screen !== undefined,
    ),
  },
  { id: 'screens-1-6', title: '1-6 판매자 신청', screens: sellerApplyPreviews },
  { id: 'screens-1-7', title: '1-7 판매자 센터 홈 · 상점', screens: sellerCenterPreviews },
  { id: 'screens-1-8', title: '1-8 판매자 상품 · 주문 · 취소', screens: sellerWorkPreviews },
  { id: 'screens-1-9', title: '1-9 판매자 정산 · 지갑', screens: sellerMoneyPreviews },
  { id: 'screens-1-10', title: '1-10 운영 어드민', screens: adminPreviews },
]

export const screenPreviews: ScreenPreview[] = screenBundles.flatMap((bundle) => bundle.screens)
