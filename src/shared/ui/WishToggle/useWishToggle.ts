import { useNavigate } from 'react-router'
import { useWishedIds, useWishMutation, type WishAccess } from '@/shared/api/wishes'
import { showToast } from '../toast'

// 카드 하트·상세 관심 버튼이 같이 쓰는 찜 토글(shared/api/wishes.ts 위에 화면 동작을 얹는다).
// 구매자·판매자: 하트를 바로 바꾸고(낙관적) 결과를 토스트로 알린다. 실패하면 하트를 되돌리고 다시 시도할 수 있게 한다.
// 비로그인: onLoginRequired(화면이 로그인 안내 모달을 띄움). 관리자: 아무것도 하지 않는다 — 화면이 버튼을 막고 이유를 보인다.

export type WishToggle = {
  access: WishAccess
  /** 찜했는가. 찜 ID를 아직 모르면 false */
  isWished: (productId: number) => boolean
  /** 찜 ID를 받았는가 (구매자·판매자이고 불러왔을 때) */
  known: boolean
  /** 찜을 뒤집는다. wished를 주면 그 값(화면에 보이는 상태)을 지금 상태로 본다 */
  toggle: (productId: number, wished?: boolean) => void
}

export function useWishToggle(onLoginRequired: () => void): WishToggle {
  const { access, wishedIds } = useWishedIds()
  const mutation = useWishMutation()
  const navigate = useNavigate()
  const isWished = (productId: number) => wishedIds?.has(productId) ?? false

  const send = (productId: number, wish: boolean) =>
    mutation.mutate(
      { productId, wish },
      {
        onSuccess: () =>
          showToast(
            wish
              ? {
                  message: '관심 상품에 담았어요',
                  action: { label: '관심 상품 보기', onClick: () => navigate('/me/likes') },
                }
              : { message: '관심 상품에서 뺐어요' },
          ),
        onError: () =>
          showToast({
            message: wish
              ? '관심 상품에 담지 못했어요. 잠시 뒤 다시 시도해 주세요'
              : '관심 상품에서 빼지 못했어요. 잠시 뒤 다시 시도해 주세요',
            action: { label: '다시 시도', onClick: () => send(productId, wish) },
          }),
      },
    )

  const toggle = (productId: number, wished = isWished(productId)) => {
    if (access === 'guest') return onLoginRequired()
    if (access !== 'buyer') return
    send(productId, !wished)
  }

  return { access, isWished, known: wishedIds !== undefined, toggle }
}
