import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { onSessionEnd } from '@/shared/api/authToken'
import type { ShippingAddress } from '@/shared/api/types'

// 체크아웃 초안 (ADR-0002, PLAN 결정 7). 잔액이 부족해 PG 충전에 다녀오는 동안(전체 새로고침) 입력한 배송지만 지킨다.
// - sessionStorage: 탭을 닫으면 지워진다. 판매자 정보 제공 동의·금액은 남기지 않는다(돌아와서 다시 확인)
// - 저장: 배송지 모달의 ‘이번 주문에 적용’ · 삭제: 주문 성공, 세션 종료(로그아웃·만료), 저장 후 30분
// - 회원 번호를 같이 적어 같은 탭에서 다른 회원으로 로그인하면 쓰지 않는다
// - 저장소를 못 쓰면(사생활 보호 모드·용량) 메모리에만 두고 화면은 그대로 동작한다

export const CHECKOUT_DRAFT_TTL_MS = 30 * 60_000
export const CHECKOUT_DRAFT_STORAGE_KEY = 'paldo.checkout.draft'

export type CheckoutDraft = { memberId: number; address: ShippingAddress; savedAt: number }

type DraftState = {
  draft: CheckoutDraft | null
  saveAddress: (memberId: number, address: ShippingAddress) => void
  clear: () => void
}

const safeSessionStorage: StateStorage = {
  getItem: (name) => {
    try {
      return sessionStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      sessionStorage.setItem(name, value)
    } catch {
      // 저장하지 못해도 이번 화면에서는 메모리 값으로 계속한다
    }
  },
  removeItem: (name) => {
    try {
      sessionStorage.removeItem(name)
    } catch {
      // 지우지 못하면 30분 만료·회원 번호 확인으로 쓰지 않는다
    }
  },
}

export const useCheckoutDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      draft: null,
      saveAddress: (memberId, address) =>
        set({ draft: { memberId, address, savedAt: Date.now() } }),
      clear: () => set({ draft: null }),
    }),
    {
      name: CHECKOUT_DRAFT_STORAGE_KEY,
      storage: createJSONStorage(() => safeSessionStorage),
      partialize: ({ draft }) => ({ draft }),
    },
  ),
)

/** 이 회원이 30분 안에 적어 둔 배송지. 없거나 지났으면 null */
export function draftAddressOf(
  draft: CheckoutDraft | null,
  memberId: number | undefined,
  now = Date.now(),
): ShippingAddress | null {
  if (!draft || memberId === undefined || draft.memberId !== memberId) return null
  if (now - draft.savedAt > CHECKOUT_DRAFT_TTL_MS) return null
  return draft.address
}

export const clearCheckoutDraft = () => useCheckoutDraftStore.getState().clear()

// 세션이 끝나면(로그아웃·만료·서버가 토큰 거절) 지운다. 이 모듈은 라우트가 주문서 화면을 불러올 때 함께 읽힌다.
// 세션 종료(로그아웃·만료)가 아니면 남는다. 토큰도 sessionStorage에 있어 PG 복귀 뒤에도 보통 로그인이 유지된다
onSessionEnd(clearCheckoutDraft)
