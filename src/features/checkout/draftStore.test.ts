import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole, type ShippingAddress } from '@/shared/api/types'
import { fakeToken } from '@/test/token'
import {
  CHECKOUT_DRAFT_STORAGE_KEY,
  CHECKOUT_DRAFT_TTL_MS,
  clearCheckoutDraft,
  draftAddressOf,
  useCheckoutDraftStore,
} from './draftStore'

const address: ShippingAddress = {
  recipientName: '이서연',
  recipientPhone: '010-2468-1357',
  zipCode: '04524',
  address: '서울 중구 세종대로 110',
}

const draft = () => useCheckoutDraftStore.getState().draft

afterEach(() => {
  vi.restoreAllMocks()
  clearCheckoutDraft()
  clearAccessToken()
  sessionStorage.clear()
})

describe('checkoutDraftStore', () => {
  it('배송지만 sessionStorage에 남기고, 같은 회원이 30분 안에만 쓴다', () => {
    useCheckoutDraftStore.getState().saveAddress(2, address)

    const stored = JSON.parse(sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY) ?? '{}')
    expect(Object.keys(stored.state)).toEqual(['draft'])
    expect(Object.keys(stored.state.draft).sort()).toEqual(['address', 'memberId', 'savedAt'])

    const saved = draft()
    expect(draftAddressOf(saved, 2)).toEqual(address)
    expect(draftAddressOf(saved, 3)).toBeNull()
    expect(draftAddressOf(saved, undefined)).toBeNull()
    const savedAt = saved?.savedAt ?? 0
    expect(draftAddressOf(saved, 2, savedAt + CHECKOUT_DRAFT_TTL_MS)).toEqual(address)
    expect(draftAddressOf(saved, 2, savedAt + CHECKOUT_DRAFT_TTL_MS + 1)).toBeNull()
  })

  it('세션이 끝나면(로그아웃·만료) 지운다', () => {
    setAccessToken(fakeToken({ memberId: 2, role: MemberRole.BUYER }))
    useCheckoutDraftStore.getState().saveAddress(2, address)

    clearAccessToken('expired')

    expect(draft()).toBeNull()
    expect(
      JSON.parse(sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY) ?? '{}').state.draft,
    ).toBeNull()
  })

  it('sessionStorage를 못 써도 이번 화면에서는 메모리 값으로 동작한다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    expect(() => useCheckoutDraftStore.getState().saveAddress(2, address)).not.toThrow()
    expect(draftAddressOf(draft(), 2)).toEqual(address)
  })
})
