// 추가 시연 장면. 본 시연(scenes.mjs)이 남긴 state.json의 계정·상품·주문으로 실행한다.
// 대부분 조회만 하고, 바꾸는 것도 시연 계정·상품·리뷰에 한정한다(판매 상태·노출은 원래대로 돌려 놓는다).
import { beat, centerInView, go, hold, press, typeIn } from './lib.mjs'

export const scenes = [
  {
    title: '구매자 상품 탐색 (카테고리 → 상세 → 리뷰)',
    role: 'buyer',
    async run({ win, state }) {
      const { page } = win.buyer
      await go(page, '/products?category=FRUIT')
      await page
        .getByRole('status')
        .filter({ hasText: /상품 \d+개/ })
        .first()
        .waitFor()
      await hold()

      // 시연 상품이 숨김이면 목록의 첫 상품으로 대신한다
      const mine = page.getByRole('link', { name: state.productName, exact: true })
      const first = page
        .getByRole('region', { name: '과일 상품' })
        .getByRole('article')
        .first()
        .getByRole('link')
      await press((await mine.isVisible().catch(() => false)) ? mine : first)
      await page.waitForURL((url) => url.pathname.startsWith('/products/'))
      await hold()
      await press(
        page
          .getByRole('navigation', { name: '상품 상세 메뉴' })
          .getByRole('link', { name: /^리뷰/ }),
      )
      await hold()
    },
  },
  {
    title: '구매자 배송 조회',
    role: 'buyer',
    async run({ win, state }) {
      const { page } = win.buyer
      await go(page, `/orders/${state.orderId}`)
      await beat()
      await press(page.getByRole('link', { name: /배송 조회$/ }).first())
      await page.getByRole('heading', { name: '배송 조회', level: 1 }).waitFor()
      await hold()
      await centerInView(page.getByRole('list', { name: '배송 진행 단계' }))
      await hold()
      await centerInView(page.getByText('송장번호', { exact: true }).first())
      await hold()
    },
  },
  {
    title: '구매자 예치금 이용 내역',
    role: 'buyer',
    async run({ win, state }) {
      const { page } = win.buyer
      await go(page, '/me/wallet')
      await page.getByRole('heading', { name: '지갑 이용 내역' }).waitFor()
      await hold()
      // 결제 내역에서 그 주문으로 이동한다
      const payment = page.getByRole('link', { name: `주문 ${state.orderId} 결제` }).first()
      if (await payment.isVisible().catch(() => false)) {
        await press(payment)
        await page.waitForURL((url) => url.pathname === `/orders/${state.orderId}`)
        await hold()
      }
    },
  },
  {
    title: '구매자 내 정보 수정',
    role: 'buyer',
    async run({ win }) {
      const { page } = win.buyer
      await go(page, '/me')
      await hold()
      await go(page, '/me/account?tab=info')
      await beat()
      await typeIn(page.getByLabel('닉네임', { exact: true }), '사과러버')
      await press(page.getByRole('button', { name: '저장', exact: true }))
      await page.getByRole('status').filter({ hasText: '내 정보를 저장했어요' }).first().waitFor()
      await hold()
    },
  },
  {
    title: '판매자 상품 판매 상태·노출 바꾸기',
    role: 'seller',
    async run({ win, state }) {
      const { page } = win.seller
      const name = state.productName
      await go(page, '/seller/products')
      await page.getByRole('table', { name: '상품 목록' }).waitFor()
      await hold()

      await press(page.getByRole('button', { name: `${name} 판매 중지` }))
      await page.getByText('판매 상태를 바꿨어요').first().waitFor()
      await hold()
      await press(page.getByRole('button', { name: `${name} 판매 재개` }))
      await page.getByText('판매 상태를 바꿨어요').first().waitFor()
      await hold()

      const visibility = page.getByRole('switch', { name: `${name} 노출` })
      await press(visibility)
      await page.getByText('숨겼어요').first().waitFor()
      await hold()
      await press(visibility)
      await page.getByText('노출을 바꿨어요').first().waitFor()
      await hold()
    },
  },
  {
    title: '관리자 정산 목록·상세, 판매자 심사 현황',
    role: 'admin',
    async run({ win }) {
      const { page } = win.admin
      await go(page, '/admin/payouts')
      const table = page.getByRole('table', { name: '정산 목록' })
      await centerInView(table)
      await hold()
      await press(table.getByRole('link', { name: /상세 보기$/ }).first())
      const detail = page.getByRole('dialog', { name: '정산 상세' })
      await detail.waitFor()
      await hold()
      await press(detail.getByRole('button', { name: '닫기', exact: true }).first())
      await beat()

      await go(page, '/admin/sellers')
      await beat()
      await press(page.getByRole('tab', { name: /^승인/ }))
      await page.getByRole('table', { name: '신청 목록' }).waitFor()
      await hold()
    },
  },
]
