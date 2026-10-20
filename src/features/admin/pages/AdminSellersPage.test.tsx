import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { applicationCounts, sellerApplicationSummaries } from '../fixtures'
import { AdminSellersPage } from './AdminPages'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/sellers" element={<AdminSellersPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => setAccessToken(fakeToken({ memberId: 1, role: MemberRole.ADMIN })))
afterEach(() => clearAccessToken())

describe('AdminSellersPage', () => {
  it('?status= 탭으로 목록을 받고, 탭 개수는 상태별 size=1 조회로 채운다', async () => {
    const requests: URLSearchParams[] = []
    server.use(
      http.get('*/api/v1/admin/seller-applications', ({ request }) => {
        const params = new URL(request.url).searchParams
        requests.push(params)
        const status = params.get('status')
        const list = sellerApplicationSummaries.filter((a) => a.status === status)
        return HttpResponse.json({
          content: params.get('size') === '1' ? list.slice(0, 1) : list,
          page: 0,
          size: Number(params.get('size')),
          totalElements: list.length,
          totalPages: 1,
        })
      }),
    )
    renderAt('/admin/sellers?status=IN_REVIEW')

    const table = await screen.findByRole('table', { name: '신청 목록' })
    expect(within(table).getByRole('link', { name: '남해 시금치밭 신청 보기' })).toHaveAttribute(
      'href',
      '/admin/sellers/16',
    )
    expect(
      await screen.findByRole('tab', { name: `심사 대기 ${applicationCounts.PENDING}` }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '심사 중 1' })).toHaveAttribute('aria-selected', 'true')

    await waitFor(() => expect(requests).toHaveLength(5))
    const listRequest = requests.find((p) => p.get('size') === '20')
    expect(listRequest?.get('status')).toBe('IN_REVIEW')
    expect(listRequest?.get('page')).toBe('0')
    expect(requests.filter((p) => p.get('size') === '1').map((p) => p.get('status'))).toEqual(
      expect.arrayContaining(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED']),
    )
  })

  it('status가 없거나 이상하면 심사 대기 탭이다', async () => {
    renderAt('/admin/sellers?status=SUSPENDED')
    expect(await screen.findByRole('tab', { name: /^심사 대기/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const table = await screen.findByRole('table', { name: '신청 목록' })
    expect(within(table).getAllByText('심사 대기')).toHaveLength(applicationCounts.PENDING)
  })

  it('목록을 못 받으면 다시 시도할 수 있다', async () => {
    server.use(
      http.get('*/api/v1/admin/seller-applications', ({ request }) => {
        if (new URL(request.url).searchParams.get('size') === '1') {
          return HttpResponse.json({
            content: [],
            page: 0,
            size: 1,
            totalElements: 0,
            totalPages: 0,
          })
        }
        return HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Forbidden',
            status: 403,
            detail: '관리자만 볼 수 있습니다.',
            instance: '/x',
          },
          { status: 403 },
        )
      }),
    )
    renderAt('/admin/sellers')
    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })
})
