import { screen } from '@testing-library/react'
import dayjs from 'dayjs'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole, PayoutEventType } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { SellerPayoutsPage } from './SellerMoneyPages'

const MEMBER_ID = 7

const summary = {
  payoutId: 12,
  snapshotId: 3,
  payeeId: MEMBER_ID,
  system: false,
  amount: 26183,
  createdAt: '2026-10-15T02:00:00',
}

const page = <T,>(content: T[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
})

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/seller/payouts" element={<SellerPayoutsPage />} />
        <Route path="/seller/payouts/:payoutId" element={<SellerPayoutsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => setAccessToken(fakeToken({ memberId: MEMBER_ID, role: MemberRole.SELLER })))
afterEach(() => clearAccessToken())

describe('SellerPayoutsPage', () => {
  it('본인 payeeId와 최근 1년(from·to)으로 목록을 받고, 상세 모달에 항목을 보여 준다', async () => {
    const lists: URLSearchParams[] = []
    server.use(
      http.get('*/api/v1/payouts', ({ request }) => {
        lists.push(new URL(request.url).searchParams)
        return HttpResponse.json(page([summary]))
      }),
      http.get('*/api/v1/payouts/12', () =>
        HttpResponse.json({
          ...summary,
          periodFrom: '2026-10-14T02:00:00',
          periodTo: '2026-10-15T02:00:00',
          itemCount: 1,
          systemPayoutId: null,
          sellerFeeAmount: 717,
          sellerFeeItemCount: 1,
        }),
      ),
      http.get('*/api/v1/payouts/12/items', () =>
        HttpResponse.json(
          page([
            {
              payoutItemId: 101,
              candidateId: 55,
              eventType: PayoutEventType.SALE_AMOUNT,
              orderItemId: 900,
              sellerId: MEMBER_ID,
              amount: 23900,
              candidateCreatedAt: '2026-10-14T15:20:00',
              adjustment: null,
            },
          ]),
        ),
      ),
    )
    renderAt('/seller/payouts/12')

    expect(await screen.findByRole('dialog', { name: '정산 상세' })).toBeInTheDocument()
    expect(await screen.findByText('주문 상품 900')).toBeInTheDocument()

    const list = lists.find((params) => params.get('size') === '20')
    expect(list?.get('payeeId')).toBe(String(MEMBER_ID))
    expect(list?.get('page')).toBe('0')
    const from = dayjs(list?.get('from'))
    const to = dayjs(list?.get('to'))
    expect(to.subtract(1, 'year').isSame(from)).toBe(true)
    expect(list?.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00$/)
  })

  it('목록 오류는 서버 detail로 보여 준다', async () => {
    server.use(
      http.get('*/api/v1/payouts', () =>
        HttpResponse.json(
          { status: 403, title: 'Forbidden', detail: '정산을 조회할 권한이 없습니다.' },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    renderAt('/seller/payouts')
    expect(await screen.findByText('정산을 조회할 권한이 없습니다.')).toBeInTheDocument()
  })

  it('내 정산이 아니면(403) 찾을 수 없다고 안내한다', async () => {
    server.use(
      http.get('*/api/v1/payouts', () => HttpResponse.json(page([]))),
      http.get('*/api/v1/payouts/:id', () =>
        HttpResponse.json(
          { status: 403, title: 'Forbidden', detail: '정산을 조회할 권한이 없습니다.' },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
      http.get('*/api/v1/payouts/:id/items', () => HttpResponse.json(page([]))),
    )
    renderAt('/seller/payouts/99')
    expect(await screen.findByText('정산 내역을 찾을 수 없어요')).toBeInTheDocument()
  })
})
