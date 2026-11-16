import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { NOTHING_TO_RESOLVE_MESSAGE } from '../errors'
import { blockedOrders } from '../fixtures'
import { AdminBlockedOrdersPage, AdminDepositChecksPage, AdminPayoutsPage } from './AdminPages'

const base = '*/api/v1/admin/payouts'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/payouts/blocked-orders" element={<AdminBlockedOrdersPage />} />
        <Route path="/admin/payouts/deposit-checks" element={<AdminDepositChecksPage />} />
        <Route path="/admin/payouts/:payoutId?" element={<AdminPayoutsPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const conflict = () =>
  HttpResponse.json(
    {
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: '해결할 잠금이나 멈춤이 없는 주문입니다.',
      instance: '/x',
    },
    { status: 409 },
  )

/** 막힌 주문 목록 요청 수를 센다 */
function countListRequests() {
  const counter = { count: 0 }
  server.use(
    http.get(`${base}/blocked-orders`, () => {
      counter.count += 1
      return HttpResponse.json({
        content: blockedOrders,
        page: 0,
        size: 20,
        totalElements: blockedOrders.length,
        totalPages: 1,
      })
    }),
  )
  return counter
}

const orderItem = (orderId: number) =>
  screen.getByRole('heading', { name: `주문 ${orderId}` }).closest('li') as HTMLElement

beforeEach(() => setAccessToken(fakeToken({ memberId: 1, role: MemberRole.ADMIN })))
afterEach(() => clearAccessToken())

describe('AdminBlockedOrdersPage', () => {
  it('상태 · 원인 · 초과 청구 근거를 보이고, 원인 상세는 HTML로 해석하지 않는다', async () => {
    renderAt('/admin/payouts/blocked-orders')
    await screen.findByRole('list', { name: '막힌 주문 목록' })

    const stopped = orderItem(2001)
    expect(within(stopped).getByText('멈춤')).toBeInTheDocument()
    const evidence = within(stopped).getByRole('table', { name: '주문 2001 초과 청구 근거' })
    const overflow = within(evidence).getByRole('row', { name: /넘친 금액/ })
    expect(overflow).toHaveTextContent('5,000원')
    expect(overflow).toHaveTextContent('0원 (바뀜)')

    const locked = orderItem(2002)
    expect(within(locked).getByText('잠김')).toBeInTheDocument()
    expect(within(locked).queryByRole('table', { name: /초과 청구 근거/ })).not.toBeInTheDocument()
    expect(
      within(locked).getByText('수수료 불일치: 기대 300, 실제 500 <b>원문</b>'),
    ).toBeInTheDocument()

    const resolved = orderItem(2003)
    expect(within(resolved).getByRole('button', { name: '주문 2003 해결' })).toBeDisabled()
    expect(within(resolved).getByText('이미 해결한 주문이에요')).toBeInTheDocument()
    expect(screen.getByText('막힌 주문 3건')).toBeInTheDocument()
  })

  it('메모 없이 해결하면 칸에 오류를 붙이고, 메모를 쓰면 POST 뒤 목록을 다시 받는다', async () => {
    const counter = countListRequests()
    const bodies: unknown[] = []
    server.use(
      http.post(`${base}/orders/:orderId/resolution`, async ({ params, request }) => {
        bodies.push({ orderId: params.orderId, ...((await request.json()) as object) })
        return HttpResponse.json(
          {
            resolutionRequestId: 'r-1',
            orderId: 2001,
            method: 'REPROCESS',
            adminId: 1,
            resolvedAt: '2026-11-16T10:00:00',
            memo: '결제 금액 바로잡음',
            resolvedFailureCount: 2,
          },
          { status: 201 },
        )
      }),
    )
    const user = renderAt('/admin/payouts/blocked-orders')
    await screen.findByRole('list', { name: '막힌 주문 목록' })
    await user.click(screen.getByRole('button', { name: '주문 2001 해결' }))

    const dialog = await screen.findByRole('dialog', { name: '주문 2001 해결' })
    await user.click(within(dialog).getByRole('button', { name: '해결' }))
    const memo = within(dialog).getByLabelText('해결 메모')
    expect(memo).toHaveAttribute('aria-invalid', 'true')
    expect(memo).toHaveFocus()
    expect(bodies).toHaveLength(0)

    await user.type(memo, '  결제 금액 바로잡음 ')
    await user.click(within(dialog).getByRole('button', { name: '해결' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(bodies).toEqual([{ orderId: '2001', memo: '결제 금액 바로잡음' }])
    expect(
      await screen.findByText(
        '주문 2001의 실패 기록 2건을 해결했어요. 다음 정산 실행에서 다시 검사해요',
      ),
    ).toBeInTheDocument()
    await waitFor(() => expect(counter.count).toBe(2))
  })

  it('409(해결할 것 없음)는 해요체로 알리고 목록을 다시 받는다', async () => {
    const counter = countListRequests()
    server.use(http.post(`${base}/orders/:orderId/resolution`, conflict))
    const user = renderAt('/admin/payouts/blocked-orders')
    await screen.findByRole('list', { name: '막힌 주문 목록' })
    await user.click(screen.getByRole('button', { name: '주문 2002 해결' }))
    const dialog = await screen.findByRole('dialog', { name: '주문 2002 해결' })
    await user.type(within(dialog).getByLabelText('해결 메모'), '확인함')
    await user.click(within(dialog).getByRole('button', { name: '해결' }))

    expect(await within(dialog).findByText(NOTHING_TO_RESOLVE_MESSAGE)).toBeInTheDocument()
    await waitFor(() => expect(counter.count).toBe(2))
  })

  it('서버 422(memo)는 칸에 붙인다', async () => {
    server.use(
      http.post(`${base}/orders/:orderId/resolution`, () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Unprocessable Entity',
            status: 422,
            detail: '요청 값이 올바르지 않습니다.',
            instance: '/x',
            errors: [
              { path: 'memo', pointer: '/memo', detail: '해결 메모는 255자 이하여야 합니다.' },
            ],
          },
          { status: 422 },
        ),
      ),
    )
    const user = renderAt('/admin/payouts/blocked-orders')
    await screen.findByRole('list', { name: '막힌 주문 목록' })
    await user.click(screen.getByRole('button', { name: '주문 2001 해결' }))
    const dialog = await screen.findByRole('dialog', { name: '주문 2001 해결' })
    await user.type(within(dialog).getByLabelText('해결 메모'), '메모')
    await user.click(within(dialog).getByRole('button', { name: '해결' }))

    expect(
      await within(dialog).findByText('해결 메모는 255자 이하여야 합니다.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText('해결 메모')).toHaveFocus()
  })

  it('해결 기록은 요청별로 먼저 보이고, 실패 기록별로 바꿔 볼 수 있다', async () => {
    const user = renderAt('/admin/payouts/blocked-orders')
    await screen.findByRole('list', { name: '막힌 주문 목록' })
    await user.click(screen.getByRole('button', { name: '주문 2003 해결 기록' }))

    const dialog = await screen.findByRole('dialog', { name: '주문 2003 해결 기록' })
    const list = await within(dialog).findByRole('list', { name: '해결 기록' })
    expect(
      within(list).getByText('검증 코드 수정 배포 후 다시 처리 <script>alert(1)</script>'),
    ).toBeInTheDocument()
    expect(within(list).getByText('다시 처리 · 실패 기록 1건')).toBeInTheDocument()

    await user.click(within(dialog).getByText('실패 기록별'))
    expect(
      await within(dialog).findByText('결과 검증 불일치: 스냅샷에 없는 항목'),
    ).toBeInTheDocument()
  })

  it('해결 기록이 없으면 빈 상태를 보여 준다', async () => {
    const user = renderAt('/admin/payouts/blocked-orders')
    await screen.findByRole('list', { name: '막힌 주문 목록' })
    await user.click(screen.getByRole('button', { name: '주문 2001 해결 기록' }))
    const dialog = await screen.findByRole('dialog', { name: '주문 2001 해결 기록' })
    expect(await within(dialog).findByText('해결 기록이 없어요')).toBeInTheDocument()
  })

  it('막힌 주문이 없으면 빈 상태를 보여 준다', async () => {
    server.use(
      http.get(`${base}/blocked-orders`, () =>
        HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
      ),
    )
    renderAt('/admin/payouts/blocked-orders')
    expect(await screen.findByText('막힌 주문이 없어요')).toBeInTheDocument()
  })
})

describe('AdminDepositChecksPage', () => {
  it('이유 · 정산 · 지갑 답 · 물어본 횟수를 보이고 정산 상세로 잇는다', async () => {
    renderAt('/admin/payouts/deposit-checks')
    const table = await screen.findByRole('table', { name: '대사 확인 목록' })

    const payeeMismatch = within(table).getByRole('row', { name: /판매자 다름/ })
    expect(payeeMismatch).toHaveTextContent('판매자 7 · 9,700원')
    expect(payeeMismatch).toHaveTextContent('판매자 8 · 9,700원')
    expect(
      within(payeeMismatch).getByRole('link', { name: '정산 1031 상세 보기' }),
    ).toHaveAttribute('href', '/admin/payouts/1031')

    const notFound = within(table).getByRole('row', { name: /입금 없음/ })
    expect(notFound).toHaveTextContent('3회 (없음 2회)')
    expect(within(table).getByRole('row', { name: /지갑 답 없음/ })).toBeInTheDocument()
    expect(within(table).getByRole('row', { name: /금액 다름/ })).toHaveTextContent('18,400원')
    expect(screen.getByText('확인할 정산 4건')).toBeInTheDocument()
  })

  it('확인할 정산이 없으면 빈 상태를 보여 준다', async () => {
    server.use(
      http.get(`${base}/deposit-checks`, () =>
        HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
      ),
    )
    renderAt('/admin/payouts/deposit-checks')
    expect(await screen.findByText('확인할 정산이 없어요')).toBeInTheDocument()
  })
})

describe('정산 관리 탭', () => {
  it('정산 → 막힌 주문 → 대사 확인으로 주소를 바꿔 오간다', async () => {
    const user = renderAt('/admin/payouts')
    await screen.findByRole('table', { name: '정산 목록' })

    await user.click(screen.getByRole('tab', { name: '막힌 주문' }))
    expect(await screen.findByRole('list', { name: '막힌 주문 목록' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '막힌 주문' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: '대사 확인' }))
    expect(await screen.findByRole('table', { name: '대사 확인 목록' })).toBeInTheDocument()
  })
})
