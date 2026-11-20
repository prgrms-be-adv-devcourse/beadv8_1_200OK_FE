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
import {
  DUPLICATE_ADJUSTMENT_MESSAGE,
  PAYOUT_RUNNING_MESSAGE,
  SKIP_WAIT_DISABLED_MESSAGE,
} from '../errors'
import { adminPayouts } from '../fixtures'
import { AdminPayoutsPage } from './AdminPages'

const base = '*/api/v1/admin/payouts'

function renderAt(path = '/admin/payouts') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/payouts" element={<AdminPayoutsPage />} />
        <Route path="/admin/payouts/:payoutId" element={<AdminPayoutsPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

/** 목록 요청 파라미터를 기록하고 fixtures를 돌려준다 */
function recordListRequests() {
  const requests: URLSearchParams[] = []
  server.use(
    http.get(base, ({ request }) => {
      requests.push(new URL(request.url).searchParams)
      return HttpResponse.json({
        content: adminPayouts,
        page: 0,
        size: 20,
        totalElements: adminPayouts.length,
        totalPages: 1,
      })
    }),
  )
  return requests
}

beforeEach(() => setAccessToken(fakeToken({ memberId: 1, role: MemberRole.ADMIN })))
afterEach(() => clearAccessToken())

describe('AdminPayoutsPage', () => {
  it('최근 30일을 from(0시, 포함)·to(다음 날 0시, 미포함)으로 보내고, 받는 사람 필터를 파라미터로 바꾼다', async () => {
    const requests = recordListRequests()
    const user = renderAt()
    await screen.findByRole('table', { name: '정산 목록' })

    const today = dayjs().startOf('day')
    expect(requests[0]?.get('from')).toBe(today.subtract(29, 'day').format('YYYY-MM-DD[T]00:00:00'))
    expect(requests[0]?.get('to')).toBe(today.add(1, 'day').format('YYYY-MM-DD[T]00:00:00'))
    expect(requests[0]?.get('page')).toBe('0')
    expect(requests[0]?.get('size')).toBe('20')
    expect(requests[0]?.has('system')).toBe(false)
    expect(requests[0]?.has('payeeId')).toBe(false)

    await user.selectOptions(screen.getByLabelText('받는 사람'), 'system')
    await waitFor(() => expect(requests.at(-1)?.get('system')).toBe('true'))

    await user.selectOptions(screen.getByLabelText('받는 사람'), 'seller')
    const sent = requests.length
    await user.type(screen.getByLabelText('판매자 회원 번호'), '7')
    await waitFor(() => expect(requests.at(-1)?.get('payeeId')).toBe('7'))
    expect(requests.at(-1)?.has('system')).toBe(false)
    expect(requests).toHaveLength(sent + 1)
  })

  it('상세 모달은 항목을 주문 상품별로 묶고 배송비는 주문 단위로 보여 준다', async () => {
    renderAt('/admin/payouts/1021')
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('판매자 7')).toBeInTheDocument()
    expect(within(dialog).getByText('주문 상품 1210')).toBeInTheDocument()
    expect(within(dialog).getByText('주문 184 배송비')).toBeInTheDocument()
  })

  it('정산 지금 실행 → POST /run → 실행 번호와 상태를 보여 준다', async () => {
    const user = renderAt()
    await screen.findByRole('table', { name: '정산 목록' })
    await user.click(screen.getByRole('button', { name: '정산 지금 실행' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '정산 실행' }),
    )
    expect(
      await screen.findByText('정산 배치를 실행했어요 · 실행 번호 101 · 상태 COMPLETED'),
    ).toBeInTheDocument()
  })

  it('대기 건너뛰고 실행 → POST /run/skip-wait → 건너뛴 결과를 보여 준다', async () => {
    const user = renderAt()
    await screen.findByRole('table', { name: '정산 목록' })
    await user.click(screen.getByRole('button', { name: '대기 건너뛰고 실행 (테스트용)' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '건너뛰고 실행' }),
    )
    expect(
      await screen.findByText('정산 배치를 실행했어요 · 실행 번호 102 · 상태 COMPLETED'),
    ).toBeInTheDocument()
    expect(screen.getByText('대기 기간을 건너뛰고 정산했어요')).toBeInTheDocument()
  })

  it('배치 실패(500)는 서버 문구로 알린다', async () => {
    server.use(
      http.post(`${base}/run`, () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Error',
            status: 500,
            detail: '정산 배치 실행에 실패했습니다.',
            instance: '/x',
          },
          { status: 500 },
        ),
      ),
    )
    const user = renderAt()
    await screen.findByRole('table', { name: '정산 목록' })
    await user.click(screen.getByRole('button', { name: '정산 지금 실행' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '정산 실행' }),
    )
    expect(await screen.findByText('정산 배치 실행에 실패했습니다.')).toBeInTheDocument()
  })

  it.each([
    ['정산 지금 실행', '정산 실행', 'run', '정산이 이미 실행 중입니다.', PAYOUT_RUNNING_MESSAGE],
    [
      '대기 건너뛰고 실행 (테스트용)',
      '건너뛰고 실행',
      'run/skip-wait',
      '정산이 이미 실행 중입니다.',
      PAYOUT_RUNNING_MESSAGE,
    ],
    [
      '대기 건너뛰고 실행 (테스트용)',
      '건너뛰고 실행',
      'run/skip-wait',
      '정산 대기 건너뛰기 실행이 꺼져 있습니다.',
      SKIP_WAIT_DISABLED_MESSAGE,
    ],
  ])('%s 409(%s)는 해요체 안내로 바꾼다', async (open, confirm, path, detail, message) => {
    server.use(
      http.post(`${base}/${path}`, () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Conflict', status: 409, detail, instance: '/x' },
          { status: 409 },
        ),
      ),
    )
    const user = renderAt()
    await screen.findByRole('table', { name: '정산 목록' })
    await user.click(screen.getByRole('button', { name: open }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: confirm }),
    )
    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('1건 정산은 서버 501이라 미지원 안내를 입력 아래에 보여 준다', async () => {
    const user = renderAt()
    await screen.findByRole('table', { name: '정산 목록' })
    const card = screen.getByRole('region', { name: '주문 상품 번호로 1건 정산' })
    await user.type(within(card).getByLabelText('주문 상품 번호'), '1301')
    await user.click(within(card).getByRole('button', { name: '정산' }))
    expect(
      await within(card).findByText(
        '아직 지원하지 않는 기능이에요. 서버에서 준비되면 쓸 수 있어요',
      ),
    ).toBeInTheDocument()
    expect(within(card).getByLabelText('주문 상품 번호')).toHaveAttribute('aria-invalid', 'true')
  })

  it('정산 조정 → POST /adjustments 본문을 보내고, 201 응답을 결과와 조정 내역에 보여 준다', async () => {
    const bodies: unknown[] = []
    server.use(
      http.post(`${base}/adjustments`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        bodies.push(body)
        return HttpResponse.json(
          {
            candidateId: 49001,
            adjustmentId: 2,
            orderId: 2001,
            orderItemId: 1302,
            sellerId: 7,
            eventType: 'SALE_AMOUNT',
            amount: -4850,
            reason: '판매 금액 오입력 정정',
            adminId: 1,
            createdAt: '2026-11-16T10:00:00',
            adjustmentCheckStatus: 'AWAITING_RESOLUTION',
          },
          { status: 201 },
        )
      }),
    )
    const user = renderAt()
    await screen.findByRole('table', { name: '정산 목록' })
    const form = screen.getByRole('heading', { name: '정산 조정' }).closest('form') as HTMLElement
    await user.type(within(form).getByLabelText('주문 상품 번호'), '1302')
    await user.type(within(form).getByLabelText('조정 금액'), '-4850')
    await user.type(within(form).getByLabelText('사유'), ' 판매 금액 오입력 정정 ')
    await user.click(within(form).getByRole('button', { name: '조정하기' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '조정 저장' }),
    )

    expect(
      await within(form).findByText(
        new RegExp(`주문 2001 · 주문 상품 1302 상품판매 대금 ${MINUS}4,850원 조정을`),
      ),
    ).toHaveTextContent('조정 번호 2')
    expect(bodies).toEqual([
      {
        orderItemId: 1302,
        eventType: 'SALE_AMOUNT',
        amount: -4850,
        reason: '판매 금액 오입력 정정',
      },
    ])
    // 해결 대기: 해결하면 금액 검사에 들어간다고 알린다 (경고 아님)
    expect(within(form).getByText('해결 대기')).toBeInTheDocument()
    expect(within(form).getByText(/막힌 주문을 해결하면 금액 검사에 들어가요/)).toBeInTheDocument()
    expect(within(form).queryByText('금액 검사 없이 지급되는 조정이에요')).not.toBeInTheDocument()
    const logs = screen.getByRole('list', { name: '이 화면에서 저장한 조정' })
    expect(within(logs).getByText('주문 상품 1302 · 상품판매 대금')).toBeInTheDocument()
    expect(within(logs).getByText('사유 · 판매 금액 오입력 정정')).toBeInTheDocument()
    expect(within(logs).getByText('해결 대기')).toBeInTheDocument()
    // 저장했으니 입력은 비운다
    expect(within(form).getByLabelText('주문 상품 번호')).toHaveValue('')
  })

  it('조정 201이 검사 밖(UNCHECKED)이면 경고하고 반대 금액 상쇄를 안내한다', async () => {
    // 기본 MSW: 주문 2004는 막힌 주문이 아니라 검사 밖으로 저장된다
    const user = renderAt()
    await screen.findByRole('table', { name: '정산 목록' })
    const form = screen.getByRole('heading', { name: '정산 조정' }).closest('form') as HTMLElement
    await user.type(within(form).getByLabelText('주문 상품 번호'), '1601')
    await user.type(within(form).getByLabelText('조정 금액'), '-4850')
    await user.type(within(form).getByLabelText('사유'), '판매 금액 오입력 정정')
    await user.click(within(form).getByRole('button', { name: '조정하기' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '조정 저장' }),
    )

    const alert = await within(form).findByRole('alert')
    expect(alert).toHaveTextContent('금액 검사 없이 지급되는 조정이에요')
    expect(within(alert).getByText('검사 밖')).toBeInTheDocument()
    expect(alert).toHaveTextContent(/의도한 조정이 아니면 다음 정산 실행 전에/)
    expect(within(alert).getByText('+4,850원')).toBeInTheDocument()
    const logs = screen.getByRole('list', { name: '이 화면에서 저장한 조정' })
    expect(within(logs).getByText('검사 밖')).toBeInTheDocument()
  })

  it('조정 409(같은 조정)는 해요체 안내로 바꾸고 입력을 남긴다', async () => {
    server.use(
      http.post(`${base}/adjustments`, () =>
        HttpResponse.json(
          {
            type: 'https://api.example.com/problems/payout/duplicate-adjustment',
            title: 'Duplicate adjustment',
            status: 409,
            detail: '같은 조정이 이미 있습니다. 한 번 더 넣으려면 사유를 다르게 적으세요.',
            instance: '/x',
          },
          { status: 409 },
        ),
      ),
    )
    const user = renderAt()
    await screen.findByRole('table', { name: '정산 목록' })
    const form = screen.getByRole('heading', { name: '정산 조정' }).closest('form') as HTMLElement
    await user.type(within(form).getByLabelText('주문 상품 번호'), '1302')
    await user.type(within(form).getByLabelText('조정 금액'), '-4850')
    await user.type(within(form).getByLabelText('사유'), '판매 금액 오입력 정정')
    await user.click(within(form).getByRole('button', { name: '조정하기' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '조정 저장' }),
    )
    expect(await within(form).findByText(DUPLICATE_ADJUSTMENT_MESSAGE)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(form).getByLabelText('주문 상품 번호')).toHaveValue('1302')
  })
})
