import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { MINUS } from '@/shared/lib/format'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { NOTHING_TO_RESOLVE_MESSAGE } from '../errors'
import { blockedOrders, orderCandidates, periodResolutionRequests } from '../fixtures'
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

/** 막힌 주문 목록 요청 주소(쿼리 문자열)를 기록하고 조건대로 거른 fixtures를 돌려준다 */
function recordBlockedRequests() {
  const urls: URL[] = []
  server.use(
    http.get(`${base}/blocked-orders`, ({ request }) => {
      const url = new URL(request.url)
      urls.push(url)
      const statuses = url.searchParams.getAll('status')
      const orderId = url.searchParams.get('orderId')
      const content = blockedOrders.filter(
        (o) =>
          (!orderId || String(o.orderId) === orderId) &&
          (statuses.length === 0 || statuses.includes(o.status)),
      )
      return HttpResponse.json({
        content,
        page: 0,
        size: 20,
        totalElements: content.length,
        totalPages: 1,
      })
    }),
  )
  return urls
}

/** 주문별 정산후보 요청 주소를 기록하고 그 주문의 fixtures를 돌려준다 */
function recordOrderCandidates() {
  const urls: URL[] = []
  server.use(
    http.get(`${base}/candidates`, ({ request }) => {
      const url = new URL(request.url)
      urls.push(url)
      const content = orderCandidates.filter(
        (c) => String(c.orderId) === url.searchParams.get('orderId'),
      )
      return HttpResponse.json({
        content,
        page: 0,
        size: 100,
        totalElements: content.length,
        totalPages: 1,
      })
    }),
  )
  return urls
}

describe('막힌 주문 조건 · 주문 하나 처리', () => {
  it('상태를 고르면 status=LOCKED&status=STOPPED처럼 반복해 보내고, 셋 다면 보내지 않는다', async () => {
    const urls = recordBlockedRequests()
    const user = renderAt('/admin/payouts/blocked-orders')
    await screen.findByRole('list', { name: '막힌 주문 목록' })
    expect(urls[0]?.searchParams.has('status')).toBe(false)

    await user.click(screen.getByRole('checkbox', { name: '해결됨' }))
    await waitFor(() => expect(urls.at(-1)?.search).toContain('status=LOCKED&status=STOPPED'))
    expect(urls.at(-1)?.search).not.toContain('status%5B%5D')
    expect(screen.queryByRole('heading', { name: '주문 2003' })).not.toBeInTheDocument()

    // 하나만 남으면 그 상태는 끌 수 없다
    await user.click(screen.getByRole('checkbox', { name: '잠김' }))
    await waitFor(() => expect(urls.at(-1)?.search).toBe('?status=STOPPED&page=0&size=20'))
    expect(screen.getByRole('checkbox', { name: '멈춤' })).toBeDisabled()
  })

  it('주문 번호로 찾으면 그 주문 줄과 기간 없는 정산후보(orderId)를 보여 준다', async () => {
    const urls = recordBlockedRequests()
    const candidateUrls = recordOrderCandidates()
    const user = renderAt('/admin/payouts/blocked-orders')
    await screen.findByRole('list', { name: '막힌 주문 목록' })

    await user.type(screen.getByLabelText('주문 번호'), '2001')
    await user.click(screen.getByRole('button', { name: '찾기' }))

    const table = await screen.findByRole('table', { name: '주문 2001 정산후보' })
    expect(urls.at(-1)?.searchParams.get('orderId')).toBe('2001')
    expect(urls.at(-1)?.searchParams.has('status')).toBe(false)
    const candidateUrl = candidateUrls.at(-1)
    expect(candidateUrl?.searchParams.get('orderId')).toBe('2001')
    expect(candidateUrl?.searchParams.get('size')).toBe('100')
    expect(candidateUrl?.searchParams.has('from')).toBe(false)
    expect(candidateUrl?.searchParams.has('to')).toBe(false)
    expect(screen.queryByRole('heading', { name: '주문 2002' })).not.toBeInTheDocument()
    // 원래 후보(정산된 것 포함)는 조정할 수 있고, 배송비 줄은 조정할 수 없다
    expect(within(table).getAllByRole('button', { name: /조정$/ })).toHaveLength(6)
    expect(
      within(within(table).getByRole('row', { name: /배송비/ })).queryByRole('button'),
    ).not.toBeInTheDocument()
  })

  it('후보 줄의 조정으로 칸을 채워 저장하고, 대기 조정 합계를 보려고 주문 줄과 후보를 다시 받는다', async () => {
    const urls = recordBlockedRequests()
    const candidateUrls = recordOrderCandidates()
    const bodies: unknown[] = []
    server.use(
      http.post(`${base}/adjustments`, async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json(
          {
            candidateId: 49001,
            adjustmentId: 1,
            orderId: 2001,
            orderItemId: 1302,
            sellerId: 7,
            eventType: 'SALE_FEE',
            amount: -150,
            reason: '정정',
            adminId: 1,
            createdAt: '2026-11-16T10:00:00',
          },
          { status: 201 },
        )
      }),
    )
    const user = renderAt('/admin/payouts/blocked-orders?orderId=2001')
    const table = await screen.findByRole('table', { name: '주문 2001 정산후보' })

    await user.click(
      within(table).getByRole('button', { name: '주문상품 1302 상품판매 수수료 조정' }),
    )
    const form = screen.getByRole('heading', { name: '정산 조정' }).closest('form') as HTMLElement
    expect(within(form).getByLabelText('주문 상품 번호')).toHaveValue('1302')
    expect(within(form).getByLabelText('항목')).toHaveValue('SALE_FEE')
    expect(within(form).getByLabelText('조정 금액')).toHaveFocus()
    expect(within(form).getByRole('region', { name: '조정 미리보기' })).toHaveTextContent('600원')

    await user.type(within(form).getByLabelText('조정 금액'), '-150')
    await user.type(within(form).getByLabelText('사유'), '정정')
    await user.click(within(form).getByRole('button', { name: '조정하기' }))
    const listBefore = urls.length
    const candidatesBefore = candidateUrls.length
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '조정 저장' }),
    )
    expect(
      await within(form).findByText(/대기 조정 합계에 들어갔는지 확인한 뒤 해결해 주세요/),
    ).toBeInTheDocument()
    expect(bodies).toEqual([
      { orderItemId: 1302, eventType: 'SALE_FEE', amount: -150, reason: '정정' },
    ])
    await waitFor(() => expect(urls.length).toBeGreaterThan(listBefore))
    await waitFor(() => expect(candidateUrls.length).toBeGreaterThan(candidatesBefore))
  })

  it('막힌 주문이 아닌 번호는 빈 상태와 정산후보를 보여 주고 조정은 열지 않는다', async () => {
    renderAt('/admin/payouts/blocked-orders?orderId=1300')
    expect(await screen.findByText('막힌 주문이 아니에요 · 주문 1300')).toBeInTheDocument()
    expect(await screen.findByText('이 주문의 정산후보가 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '정산 조정' })).not.toBeInTheDocument()
  })

  it('해결한 주문은 정산후보만 보이고 조정은 열지 않는다', async () => {
    renderAt('/admin/payouts/blocked-orders?orderId=2003')
    await screen.findByRole('heading', { name: '주문 2003' })
    expect(await screen.findByText(/해결한 주문이라 조정하지 않아요/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '정산 조정' })).not.toBeInTheDocument()
  })

  it('막힌 주문 줄에 대기 조정 합계 두 칸을 보여 준다', async () => {
    renderAt('/admin/payouts/blocked-orders')
    await screen.findByRole('list', { name: '막힌 주문 목록' })
    const fee = orderItem(2002)
    expect(within(fee).getByText('대기 조정 · 판매 대금').nextElementSibling).toHaveTextContent(
      '+200원',
    )
    expect(within(fee).getByText('대기 조정 · 수수료').nextElementSibling).toHaveTextContent(
      `${MINUS}200원`,
    )
    // 금액 불일치가 아닌 해결한 주문에는 없다
    expect(within(orderItem(2003)).queryByText('대기 조정 · 판매 대금')).not.toBeInTheDocument()
  })

  it('금액 불일치인데 대기 조정이 0원이면 해결 모달에서 한 번 더 알린다', async () => {
    const user = renderAt('/admin/payouts/blocked-orders')
    await screen.findByRole('list', { name: '막힌 주문 목록' })
    await user.click(screen.getByRole('button', { name: '주문 2001 해결' }))
    const dialog = await screen.findByRole('dialog', { name: '주문 2001 해결' })
    expect(within(dialog).getByText(/대기 조정 합계가 0원이에요/)).toBeInTheDocument()
  })
})

describe('해결 기록 전체 목록', () => {
  function recordResolutionRequests() {
    const urls: URL[] = []
    server.use(
      http.get(`${base}/resolution-requests`, ({ request }) => {
        urls.push(new URL(request.url))
        return HttpResponse.json({
          content: periodResolutionRequests,
          page: 0,
          size: 20,
          totalElements: periodResolutionRequests.length,
          totalPages: 1,
        })
      }),
    )
    return urls
  }

  it('최근 30일을 해결 시각 from(포함)·to(다음 날 0시)로 보내고, 관리자 번호를 거른다', async () => {
    const urls = recordResolutionRequests()
    const user = renderAt('/admin/payouts/blocked-orders')
    await screen.findByRole('list', { name: '막힌 주문 목록' })
    await user.click(screen.getByRole('radio', { name: '해결 기록' }))

    const list = await screen.findByRole('list', { name: '해결 기록 전체 목록' })
    const today = dayjs().startOf('day')
    expect(urls[0]?.searchParams.get('from')).toBe(
      today.subtract(29, 'day').format('YYYY-MM-DD[T]00:00:00'),
    )
    expect(urls[0]?.searchParams.get('to')).toBe(
      today.add(1, 'day').format('YYYY-MM-DD[T]00:00:00'),
    )
    expect(urls[0]?.searchParams.has('adminId')).toBe(false)
    expect(within(list).getByText('지갑 결제 기록 들어온 것 확인')).toBeInTheDocument()
    expect(screen.getByText('해결 요청 2건')).toBeInTheDocument()

    await user.type(screen.getByLabelText('관리자 회원 번호'), '2')
    await waitFor(() => expect(urls.at(-1)?.searchParams.get('adminId')).toBe('2'))
  })

  it('관리자 번호가 숫자가 아니면 부르지 않고 칸에 오류를 보여 준다', async () => {
    const urls = recordResolutionRequests()
    const user = renderAt('/admin/payouts/blocked-orders?view=resolutions')
    await screen.findByRole('list', { name: '해결 기록 전체 목록' })
    const sent = urls.length
    await user.type(screen.getByLabelText('관리자 회원 번호'), 'a')
    expect(
      await screen.findByText('관리자 회원 번호는 1 이상의 숫자로 입력해 주세요'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '해결 기록 전체 목록' })).not.toBeInTheDocument()
    expect(urls).toHaveLength(sent)
  })

  it('줄의 주문 기록 보기는 그 주문의 해결 기록을 실패 기록별로 연다', async () => {
    const user = renderAt('/admin/payouts/blocked-orders?view=resolutions')
    const list = await screen.findByRole('list', { name: '해결 기록 전체 목록' })
    await user.click(within(list).getByRole('button', { name: '주문 2003 해결 기록 보기' }))
    const dialog = await screen.findByRole('dialog', { name: '주문 2003 해결 기록' })
    expect(
      await within(dialog).findByText('결과 검증 불일치: 스냅샷에 없는 항목'),
    ).toBeInTheDocument()
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
