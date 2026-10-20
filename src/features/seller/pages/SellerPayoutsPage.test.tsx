import { screen, waitFor } from '@testing-library/react'
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

const page = <T,>(content: T[], totalElements = content.length) => ({
  content,
  page: 0,
  size: 20,
  totalElements,
  totalPages: 1,
})

const forbidden = () =>
  HttpResponse.json(
    { status: 403, title: 'Forbidden', detail: '정산을 조회할 권한이 없습니다.' },
    { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
  )

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
  it('/payouts/me 를 최근 1년(from·to, payeeId 없음)으로 받고, 상세 모달에 항목을 보여 준다', async () => {
    const lists: URLSearchParams[] = []
    server.use(
      http.get('*/api/v1/payouts/me', ({ request }) => {
        lists.push(new URL(request.url).searchParams)
        return HttpResponse.json(page([summary]))
      }),
      http.get('*/api/v1/payouts/me/12', () =>
        HttpResponse.json({
          ...summary,
          periodFrom: '2026-10-14T02:00:00',
          periodTo: '2026-10-15T02:00:00',
          itemCount: 1,
          sellerFeeAmount: 717,
          sellerFeeItemCount: 1,
        }),
      ),
      http.get('*/api/v1/payouts/me/12/items', () =>
        HttpResponse.json(
          page([
            {
              payoutItemId: 101,
              candidateId: 55,
              eventType: PayoutEventType.SALE_AMOUNT,
              orderId: 90,
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
    expect(list?.has('payeeId')).toBe(false)
    expect(list?.get('page')).toBe('0')
    const from = dayjs(list?.get('from'))
    const to = dayjs(list?.get('to'))
    expect(to.subtract(1, 'year').isSame(from)).toBe(true)
    expect(list?.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00$/)
  })

  it('정산 예정 금액은 미정산 후보(unsettledOnly=true)의 합계, 건수는 totalElements', async () => {
    let candidateParams: URLSearchParams | undefined
    server.use(
      http.get('*/api/v1/payouts/me', () => HttpResponse.json(page([]))),
      http.get('*/api/v1/payouts/me/candidates', ({ request }) => {
        candidateParams = new URL(request.url).searchParams
        const candidate = (candidateId: number, amount: number) => ({
          candidateId,
          eventType: PayoutEventType.SALE_AMOUNT,
          orderId: 1,
          orderItemId: candidateId,
          sellerId: MEMBER_ID,
          amount,
          candidateCreatedAt: '2026-10-18T10:00:00',
          settled: false,
          payoutId: null,
          adjustment: null,
        })
        return HttpResponse.json(page([candidate(1, 23900), candidate(2, 3000)], 137))
      }),
    )
    renderAt('/seller/payouts')

    const summarySection = await screen.findByRole('region', { name: '정산 요약' })
    await waitFor(() => expect(summarySection).toHaveTextContent('26,900'))
    expect(summarySection).toHaveTextContent('137건 이상')
    expect(candidateParams?.get('unsettledOnly')).toBe('true')
    expect(candidateParams?.get('size')).toBe('100')
    expect(candidateParams?.has('from')).toBe(true)
  })

  it('후보 조회가 실패해도 목록은 보여 주고 요약 칸만 비운다', async () => {
    server.use(
      http.get('*/api/v1/payouts/me', () => HttpResponse.json(page([summary]))),
      http.get('*/api/v1/payouts/me/candidates', forbidden),
    )
    renderAt('/seller/payouts')
    expect(
      await screen.findAllByRole('link', { name: '10월 15일 정산 12 상세 보기' }),
    ).not.toHaveLength(0)
    await waitFor(() => expect(screen.getAllByText('정보 없음').length).toBeGreaterThan(0))
  })

  it('목록 오류는 서버 detail로 보여 준다', async () => {
    server.use(http.get('*/api/v1/payouts/me', forbidden))
    renderAt('/seller/payouts')
    expect(await screen.findByText('정산을 조회할 권한이 없습니다.')).toBeInTheDocument()
  })

  it('내 정산이 아니면(403) 찾을 수 없다고 안내한다', async () => {
    server.use(
      http.get('*/api/v1/payouts/me', () => HttpResponse.json(page([]))),
      http.get('*/api/v1/payouts/me/:id', forbidden),
      http.get('*/api/v1/payouts/me/:id/items', () => HttpResponse.json(page([]))),
    )
    renderAt('/seller/payouts/99')
    expect(await screen.findByText('정산 내역을 찾을 수 없어요')).toBeInTheDocument()
  })
})
