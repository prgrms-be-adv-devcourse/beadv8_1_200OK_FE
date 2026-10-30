import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
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

  it('정산 조정은 서버 501이라 저장 뒤 패널 위에 미지원 안내를 보여 준다', async () => {
    const user = renderAt()
    await screen.findByRole('table', { name: '정산 목록' })
    const form = screen.getByRole('heading', { name: '정산 조정' }).closest('form') as HTMLElement
    await user.type(within(form).getByLabelText('주문 상품 번호'), '1210')
    await user.type(within(form).getByLabelText('조정 금액'), '-10000')
    await user.type(within(form).getByLabelText('사유'), '구매확정 후 환불 회수')
    await user.click(within(form).getByRole('button', { name: '조정하기' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '조정 저장' }),
    )
    expect(
      await within(form).findByText(
        '아직 지원하지 않는 기능이에요. 서버에서 준비되면 쓸 수 있어요',
      ),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // 실패했으니 입력은 남아 있다
    expect(within(form).getByLabelText('주문 상품 번호')).toHaveValue('1210')
  })
})
