// 시연 장면. 각 장면은 화면을 실제로 조작하고, 다음 장면에 필요한 값은 state에 남긴다.
// 사람이 하는 일: 시작할 때 관리자 로그인, 5번 장면 끝의 토스 테스트 결제.
import { fileURLToPath } from 'node:url'
import { api, apiToken, ask, beat, go, hold, showRole, sleep, typeIn, uiLogin } from './lib.mjs'

const PRODUCT_IMAGE = fileURLToPath(new URL('./assets/product.png', import.meta.url))
const PRODUCT_PRICE = 30_000

export function createState() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const suffix = `${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`
  const digits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('')
  const businessNumber = `${digits(3)}-${digits(2)}-${digits(5)}`
  return {
    suffix,
    password: 'Demo1234!x',
    buyer: { loginId: `db${suffix}`, nickname: '시연구매자', signedUp: false },
    seller: { loginId: `ds${suffix}` },
    storeName: `[시연] 햇살농원 ${suffix.slice(-4)}`,
    businessNumber,
    productName: `[시연] 청송 꿀사과 ${suffix.slice(-4)}`,
    productId: null,
    orderId: null,
  }
}

/** 판매자 계정은 화면 밖에서 만든다(가입 장면은 구매자로 한 번만 보여 준다) */
export async function prepare(state) {
  try {
    await api('/members/signup', {
      method: 'POST',
      body: {
        loginId: state.seller.loginId,
        password: state.password,
        email: `${state.seller.loginId}@example.com`,
        name: '김시연',
        nickname: '시연판매자',
        termsAgreed: true,
        privacyAgreed: true,
      },
    })
  } catch (error) {
    if (error.status !== 409) throw error
  }
}

export const scenes = [
  {
    title: '구매자 회원가입·로그인',
    role: 'buyer',
    async run({ win, state }) {
      const { page } = win.buyer
      const { loginId, nickname } = state.buyer
      await go(page, '/signup')
      await typeIn(page.getByLabel('아이디', { exact: true }), loginId)
      await typeIn(page.getByLabel('비밀번호', { exact: true }), state.password)
      await typeIn(page.getByLabel('비밀번호 확인', { exact: true }), state.password)
      await typeIn(page.getByLabel('이메일', { exact: true }), `${loginId}@example.com`)
      await typeIn(page.getByLabel('이름', { exact: true }), '이구매')
      await typeIn(page.getByLabel('닉네임', { exact: true }), nickname)
      await page.getByLabel('약관 전체 동의').check()
      await page.getByRole('button', { name: '가입하기' }).click()
      await page.getByRole('heading', { name: /가입을 환영해요/ }).waitFor()
      await sleep(1500)
      await uiLogin(page, loginId, state.password)
      state.buyer.signedUp = true

      // 주문서에 쓸 기본 배송지는 화면 밖에서 저장한다(우편번호 찾기는 외부 팝업이라 자동화하지 않는다)
      const token = await apiToken(loginId, state.password)
      await api('/shipments/addresses/default', {
        token,
        method: 'PUT',
        body: {
          recipientName: '이구매',
          recipientPhone: '010-1234-5678',
          postalCode: '06236',
          address: '서울특별시 강남구 테헤란로 152',
          addressDetail: '시연 101호',
        },
      })
    },
  },
  {
    title: '판매자 입점 신청',
    role: 'seller',
    async run({ win, state }) {
      const { page } = win.seller
      await uiLogin(page, state.seller.loginId, state.password)
      await go(page, '/seller/apply')
      await typeIn(page.getByLabel('상호명', { exact: true }), state.storeName)
      await typeIn(page.getByLabel('대표자명', { exact: true }), '김시연')
      await typeIn(page.getByLabel('사업자등록번호', { exact: true }), state.businessNumber)
      await typeIn(page.getByLabel('통신판매업 신고번호', { exact: true }), '제2026-시연-0001호')
      await page.getByRole('button', { name: '다음', exact: true }).click()
      await sleep(1000)
      await page.getByRole('button', { name: '판매자 등록 신청하기' }).click()
      await page.getByRole('heading', { name: '판매자 등록을 신청했어요' }).waitFor()
    },
  },
  {
    title: '관리자 심사·승인 → 판매자 권한 받기',
    role: 'admin',
    async run({ win, state }) {
      const { page } = win.admin
      await go(page, '/admin/sellers')
      await page.getByRole('link', { name: `${state.storeName} 신청 보기` }).click()
      await page.getByRole('button', { name: '심사 시작' }).click()
      await page.getByRole('button', { name: '승인', exact: true }).click()
      await page.getByText('판매자를 승인했어요').first().waitFor()

      // 판매자 창: 신청 현황을 다시 열면 새 토큰을 받고 판매자 센터로 넘어간다
      await sleep(1500)
      await showRole(win, 'seller')
      const seller = win.seller.page
      await go(seller, '/seller/apply/status')
      await seller.waitForURL((url) => url.pathname === '/seller')

      // 상점 프로필은 화면 밖에서 등록한다
      const token = await apiToken(state.seller.loginId, state.password)
      try {
        await api('/sellers/me/profile', {
          token,
          method: 'POST',
          body: {
            storeName: state.storeName,
            representativeName: '김시연',
            customerServicePhone: '054-123-4567',
            introduction: '시연용 상점이에요',
          },
        })
      } catch (error) {
        if (error.status !== 409) throw error
      }
    },
  },
  {
    title: '판매자 상품 등록',
    role: 'seller',
    async run({ win, state }) {
      const { page } = win.seller
      await go(page, '/seller/products/new')
      await typeIn(page.getByLabel('상품명', { exact: true }), state.productName)
      await page.getByLabel('상품 사진 파일 고르기').setInputFiles(PRODUCT_IMAGE)

      const editor = page.locator('#product-description')
      await editor.waitFor()
      await editor.click()
      await page.keyboard.type('청송 일교차가 키운 아삭한 꿀사과예요. 산지에서 바로 보내 드려요.', {
        delay: 25,
      })

      await typeIn(page.locator('#option-0-name'), '3kg 특품')
      await typeIn(page.locator('#option-0-salePrice'), PRODUCT_PRICE)
      await typeIn(page.locator('#option-0-listPrice'), 40_000)
      await typeIn(page.locator('#option-0-totalStock'), 100)

      // 위아래 고정 막대에 가리지 않도록 화면 가운데로 옮긴 뒤 누른다
      const onSale = page.locator('label').filter({ hasText: /^판매 중$/ })
      await centerInView(onSale)
      await onSale.click()
      const visibility = page.getByRole('switch')
      await centerInView(visibility)
      await visibility.check()
      await page.getByText('공개', { exact: true }).waitFor()

      // 사진 업로드가 끝나야 버튼이 열린다(click이 활성화를 기다린다)
      await page.getByRole('button', { name: '등록하기' }).click()
      await page.waitForURL((url) => url.pathname === '/seller/products')

      const token = await apiToken(state.seller.loginId, state.password)
      const { content } = await api('/sellers/me/products?page=0&size=20', { token })
      const product = content
        .filter((item) => item.name === state.productName)
        .sort((a, b) => b.productId - a.productId)[0]
      if (!product) throw new Error('등록한 상품을 찾지 못했어요')
      state.productId = product.productId
    },
  },
  {
    title: '구매자 장바구니 담기 → 토스 충전창 열기',
    role: 'buyer',
    async run({ win, state }) {
      const { page } = win.buyer
      await go(page, `/products/${state.productId}`)
      await beat()
      await page.getByRole('button', { name: '장바구니 담기' }).click()
      await page.getByText('장바구니에 담았어요').first().waitFor()
      await hold()

      await go(page, '/wallet/charge')
      await beat()
      await page.getByRole('button', { name: '+5만' }).click()
      await beat()
      await page.getByRole('button', { name: /원 충전하기$/ }).click()

      const terms = page.getByRole('dialog', { name: '첫 충전 전에 약관에 동의해 주세요' })
      if (await terms.isVisible({ timeout: 3000 }).catch(() => false)) {
        await terms.getByLabel('전체 동의').check()
        await terms.getByRole('button', { name: '동의하고 충전하기' }).click()
      }

      console.log(
        '\n💳 구매자 창의 토스 결제창에서 테스트 결제를 진행해 주세요. 충전이 끝나면 자동으로 넘어가요.',
      )
      await page.waitForURL(/\/wallet\/charge\/success/, { timeout: 0 })
      await page.getByRole('heading', { name: /충전했어요/ }).waitFor({ timeout: 60_000 })
      await hold()
    },
  },
  {
    title: '구매자 주문·예치금 결제',
    role: 'buyer',
    async run({ win, state }) {
      const { page } = win.buyer
      await go(page, '/cart')
      await beat()
      await page.getByRole('button', { name: /개 주문하기$/ }).click()
      await page.waitForURL((url) => url.pathname === '/checkout')
      // 배송지·배송비·예치금 잔액을 보여 준다
      await page.getByRole('button', { name: /원 결제하기$/ }).waitFor()
      await hold()
      await page.getByLabel('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요').check()
      await beat()
      await page.getByRole('button', { name: /원 결제하기$/ }).click()
      await page.waitForURL(/\/checkout\/complete/, { timeout: 30_000 })
      state.orderId = Number(new URL(page.url()).searchParams.get('orderId'))
      await page.getByRole('heading', { name: '주문이 완료됐어요' }).waitFor()
      await hold()
    },
  },
  {
    title: '판매자 송장 등록·출고',
    role: 'seller',
    async run({ win, state }) {
      const { page } = win.seller
      await go(page, '/seller/orders')
      await page.getByRole('button', { name: `주문 ${state.orderId} 송장 등록` }).waitFor()
      await hold()
      await page.getByRole('button', { name: `주문 ${state.orderId} 송장 등록` }).click()
      const dialog = page.getByRole('dialog', { name: '송장 등록' })
      await beat()
      const trackingNumber = `61${Date.now().toString().slice(-10)}`
      await typeIn(dialog.getByLabel('송장번호'), trackingNumber)
      await beat()
      await dialog.getByRole('button', { name: '송장 등록' }).click()
      await page.getByText('송장을 등록했어요').first().waitFor()
      await hold()
    },
  },
  {
    title: '구매자 구매확정',
    role: 'buyer',
    async run({ win, state }) {
      const { page } = win.buyer
      await go(page, `/orders/${state.orderId}`)
      // 가짜 택배사가 몇 초 뒤 배송 완료로 바꾼다. 버튼이 보일 때까지 새로고침한다
      const confirm = page.getByRole('button', { name: `${state.productName} 구매확정` }).first()
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (await confirm.isVisible().catch(() => false)) break
        await sleep(3000)
        await page.reload()
      }
      await hold()
      await confirm.click()
      await beat()
      await page.getByRole('dialog').getByRole('button', { name: '구매확정', exact: true }).click()
      await page.getByText('구매확정했어요').first().waitFor()
      await hold()
    },
  },
  {
    title: '관리자 정산 실행 (대기 건너뛰기)',
    role: 'admin',
    async run({ win, auto }) {
      const { page } = win.admin
      await go(page, '/admin/payouts')
      const countText = page.getByText(/정산 대기 후보 [\d,]+건/)
      let count = 0
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await countText.waitFor()
        count = Number((await countText.textContent()).replace(/\D/g, ''))
        if (count > 0) break
        await sleep(3000)
        await page.reload()
      }

      // 이번 주문 1건 = 판매 대금 1건 + 플랫폼 수수료 1건
      if (count !== 2) {
        if (auto)
          throw new Error(`정산 대기 후보가 ${count}건이라(이번 시연 건은 2건) 실행하지 않았어요`)
        const answer = await ask(
          `\n⚠️  정산 대기 후보가 ${count}건이에요(이번 시연 건은 2건). 다른 사람 건이 섞였을 수 있어요. 그래도 실행할까요? (y/N) `,
        )
        if (answer.trim().toLowerCase() !== 'y') throw new Error('정산 실행을 멈췄어요')
      }

      await hold()
      await page.getByRole('button', { name: '대기 건너뛰고 실행 (테스트용)' }).click()
      const dialog = page.getByRole('dialog', { name: '대기 기간을 건너뛰고 정산할까요?' })
      await beat()
      await dialog.getByRole('button', { name: '건너뛰고 실행' }).click()
      await page.getByText('정산 배치를 실행했어요').first().waitFor({ timeout: 60_000 })
      await hold()
    },
  },
  {
    title: '판매자 지갑·정산 상세 확인',
    role: 'seller',
    async run({ win }) {
      const { page } = win.seller
      await go(page, '/seller')
      await page.getByText('판매자 지갑 잔액').first().waitFor()
      await hold()
      await go(page, '/seller/payouts')
      await beat()
      await page
        .getByRole('link', { name: /정산 \d+ 상세 보기/ })
        .first()
        .click()
      await page.getByRole('dialog', { name: '정산 상세' }).waitFor()
      await hold()
    },
  },
]

function centerInView(locator) {
  return locator.evaluate((element) => element.scrollIntoView({ block: 'center' }))
}

/** 중간부터 다시 시작할 때 구매자·판매자 창에 다시 로그인한다(세션은 창을 닫으면 사라진다) */
export async function restoreSessions({ win, state, from }) {
  if (from > 1 && state.buyer.signedUp) {
    await uiLogin(win.buyer.page, state.buyer.loginId, state.password)
  }
  if (from > 2) {
    await uiLogin(win.seller.page, state.seller.loginId, state.password)
  }
}
