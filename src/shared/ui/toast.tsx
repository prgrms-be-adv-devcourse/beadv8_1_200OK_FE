import { randomId } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import classes from './toast.module.css'

// 토스트: 짧은 해요체 문구 + 액션 링크 최대 1개 (design/COMPONENTS.md 토스트)
// 예: showToast({ message: '장바구니에 담았어요', action: { label: '장바구니 보기', onClick: () => navigate('/cart') } })
// 토스트는 라우터 밖(Notifications)에 그려지므로 링크 대신 onClick으로 이동한다.

export type ToastAction = { label: string; onClick: () => void }

export function showToast({ message, action }: { message: string; action?: ToastAction }) {
  const id = randomId()

  notifications.show({
    id,
    message: action ? (
      <span className={classes.message}>
        {message}
        <span aria-hidden="true">·</span>
        <button
          type="button"
          className={classes.action}
          onClick={() => {
            notifications.hide(id)
            action.onClick()
          }}
        >
          {action.label}
        </button>
      </span>
    ) : (
      message
    ),
  })

  return id
}
