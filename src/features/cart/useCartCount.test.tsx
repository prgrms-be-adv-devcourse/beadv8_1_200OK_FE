import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { useCartCount } from './queries'

function CartCount() {
  const count = useCartCount()
  return <p>{count === undefined ? '개수 없음' : `${count}줄`}</p>
}

afterEach(() => clearAccessToken())

describe('useCartCount', () => {
  it('구매자는 장바구니를 불러와 담긴 줄 수를 준다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    render(<CartCount />)
    expect(await screen.findByText(/^\d+줄$/)).toBeInTheDocument()
  })

  it('관리자는 장바구니 API(BUYER 전용)를 부르지 않는다', async () => {
    let called = false
    server.use(
      http.get('*/api/v1/cart', () => {
        called = true
        return HttpResponse.json({}, { status: 403 })
      }),
    )
    setAccessToken(fakeToken({ role: MemberRole.ADMIN }))
    render(<CartCount />)

    expect(screen.getByText('개수 없음')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(called).toBe(false)
  })
})
