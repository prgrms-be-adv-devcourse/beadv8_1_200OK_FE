import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole, SellerApplicationStatus } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { findApplication } from '../fixtures'
import { AdminSellerDetailPage } from './AdminPages'

const PENDING_ID = 13
const REVIEWING_ID = 16
const base = '*/api/v1/admin/seller-applications'

const problem = (status: number, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/x', ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

function renderAt(applicationId: number | string) {
  render(
    <MemoryRouter initialEntries={[`/admin/sellers/${applicationId}`]}>
      <Routes>
        <Route path="/admin/sellers/:applicationId" element={<AdminSellerDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

beforeEach(() => setAccessToken(fakeToken({ memberId: 1, role: MemberRole.ADMIN })))
afterEach(() => clearAccessToken())

describe('AdminSellerDetailPage', () => {
  it('심사 시작 → 승인/반려가 생기고, 승인하면 승인됨으로 바뀐다', async () => {
    const user = renderAt(PENDING_ID)
    expect((await screen.findAllByText('영암 무화과정원')).length).toBeGreaterThan(0)
    expect(screen.getByText('신청 회원 번호')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '심사 시작' }))
    expect(await screen.findByText('심사를 시작했어요')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '승인' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '반려' })).toBeInTheDocument()
    expect(screen.getByText('심사 시작', { selector: 'li span' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '승인' }))
    expect(await screen.findByText('영암 무화과정원 판매자를 승인했어요')).toBeInTheDocument()
    expect(await screen.findByText('승인됨')).toBeInTheDocument()
    expect(screen.getByText('관리자 1 · 승인')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '승인' })).not.toBeInTheDocument()
  })

  it('반려 사유가 비면 서버에 보내지 않고, 서버 422는 모달을 열어 둔 채 칸에 보여 준다', async () => {
    const bodies: unknown[] = []
    server.use(
      http.post(`${base}/${REVIEWING_ID}/reject`, async ({ request }) => {
        bodies.push(await request.json())
        return problem(422, '요청 값이 올바르지 않습니다.', {
          errors: [
            { path: 'reason', pointer: '/reason', detail: '거절 사유는 500자 이하여야 합니다.' },
          ],
        })
      }),
    )
    const user = renderAt(REVIEWING_ID)
    await user.click(await screen.findByRole('button', { name: '반려' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '반려' }))
    expect(within(dialog).getByText('사유를 입력해 주세요')).toBeInTheDocument()
    expect(bodies).toHaveLength(0)

    await user.type(within(dialog).getByLabelText('사유'), '서류가 맞지 않아요')
    await user.click(within(dialog).getByRole('button', { name: '반려' }))
    expect(await within(dialog).findByText('요청 값이 올바르지 않습니다.')).toBeInTheDocument()
    expect(bodies).toEqual([{ reason: '서류가 맞지 않아요' }])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('반려하면 토스트와 함께 반려됨으로 바뀐다', async () => {
    const user = renderAt(REVIEWING_ID)
    await user.click(await screen.findByRole('button', { name: '반려' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('사유'), '서류가 맞지 않아요')
    await user.click(within(dialog).getByRole('button', { name: '반려' }))
    expect(await screen.findByText('신청을 반려했어요')).toBeInTheDocument()
    expect(await screen.findByText('반려됨')).toBeInTheDocument()
    expect(screen.getByText('관리자 1 · 반려 — 서류가 맞지 않아요')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('승인이 409면 서버 문구를 알리고 상세를 다시 받아 바뀐 상태를 보여 준다', async () => {
    const detail = findApplication(REVIEWING_ID)
    let gets = 0
    server.use(
      http.get(`${base}/${REVIEWING_ID}`, () => {
        gets += 1
        return HttpResponse.json(
          gets === 1
            ? detail
            : {
                ...detail,
                status: SellerApplicationStatus.REJECTED,
                rejectedAt: '2026-10-18T14:00:00',
                rejectReason: '다른 관리자가 반려했어요',
                reviewerId: 2,
              },
        )
      }),
      http.post(`${base}/${REVIEWING_ID}/approve`, () =>
        problem(409, '다른 관리자가 먼저 처리한 신청입니다.'),
      ),
    )
    const user = renderAt(REVIEWING_ID)
    await user.click(await screen.findByRole('button', { name: '승인' }))
    expect(await screen.findByText('다른 관리자가 먼저 처리한 신청입니다.')).toBeInTheDocument()
    expect(await screen.findByText('반려됨')).toBeInTheDocument()
    expect(screen.getByText('관리자 2 · 반려 — 다른 관리자가 반려했어요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '승인' })).not.toBeInTheDocument()
  })

  it('없는 신청(404)은 찾을 수 없다고 안내한다', async () => {
    renderAt(9999)
    expect(await screen.findByText('신청을 찾을 수 없어요')).toBeInTheDocument()
  })
})
