import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { ChargeStatus, MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import type { AdminChargeDetail } from '../charges'
import {
  CHARGE_AFTER_FAILURE,
  CHARGE_DONE,
  CHARGE_NOT_FOUND,
  CHARGE_UNKNOWN,
  findChargeDetail,
} from '../fixtures'
import { AdminChargeDetailPage, AdminChargesPage } from './AdminChargesPages'

const base = '*/api/v1/admin/wallets/charges'

const problem = (status: number, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/x', ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

const detailOf = (chargeNo: string) => findChargeDetail(chargeNo) as AdminChargeDetail

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/charges" element={<AdminChargesPage />} />
        <Route path="/admin/charges/:chargeNo" element={<AdminChargeDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const renderDetail = (chargeNo: string) => renderAt(`/admin/charges/${chargeNo}`)

/** 상세 GET을 센다. after가 있으면 두 번째부터 그 응답 */
function countDetail(chargeNo: string, after?: AdminChargeDetail) {
  const calls = { count: 0 }
  server.use(
    http.get(`${base}/${chargeNo}`, () => {
      calls.count += 1
      return HttpResponse.json(calls.count > 1 && after ? after : detailOf(chargeNo))
    }),
  )
  return calls
}

const button = (name: string) => screen.getByRole('button', { name })

beforeEach(() => setAccessToken(fakeToken({ memberId: 1, role: MemberRole.ADMIN })))
afterEach(() => clearAccessToken())

describe('AdminChargesPage', () => {
  it('멈춘 처리 중 건과 승인 뒤 실패한 건을 나눠 보이고, 상세로 간다', async () => {
    const user = renderAt('/admin/charges')
    const held = await screen.findByRole('region', { name: /멈춘 처리 중 건/ })
    const awaiting = screen.getByRole('region', { name: /승인 뒤 실패한 건/ })
    expect(within(held).getByText(CHARGE_DONE)).toBeInTheDocument()
    expect(within(held).getByText('취소 결과 모름')).toBeInTheDocument()
    expect(within(awaiting).getByText(CHARGE_AFTER_FAILURE)).toBeInTheDocument()
    expect(within(awaiting).getByText('결제 취소 필요')).toBeInTheDocument()

    await user.click(within(held).getByRole('link', { name: `충전 건 ${CHARGE_DONE} 처리하기` }))
    expect(await screen.findByRole('heading', { name: '토스 결제' })).toBeInTheDocument()
  })

  it('처리할 건이 없으면 빈 상태를 보인다', async () => {
    server.use(http.get(base, () => HttpResponse.json([])))
    renderAt('/admin/charges')
    expect(await screen.findByText('처리할 충전 건이 없어요')).toBeInTheDocument()
  })
})

describe('AdminChargeDetailPage', () => {
  it('토스 DONE 같은 금액이면 잔액 반영·결제 취소를 켜고, 반영하면 상세를 다시 받아 결과를 보인다', async () => {
    const calls = countDetail(CHARGE_DONE, {
      ...detailOf(CHARGE_DONE),
      charge: { ...detailOf(CHARGE_DONE).charge, status: ChargeStatus.COMPLETED },
    })
    const user = renderDetail(CHARGE_DONE)
    expect(await screen.findByText('승인됨 (DONE)')).toBeInTheDocument()
    expect(button('잔액 반영')).toBeEnabled()
    expect(button('결제 취소')).toBeEnabled()
    expect(button('실패 처리')).toBeDisabled()
    expect(
      screen.getByText('토스 결제가 승인됐거나 아직 진행 중이라 실패로 둘 수 없어요'),
    ).toBeInTheDocument()

    await user.click(button('잔액 반영'))
    expect(await screen.findByText('잔액에 반영했어요')).toBeInTheDocument()
    expect(await screen.findByText('잔액에 반영됐어요')).toBeInTheDocument()
    expect(calls.count).toBe(2)
    expect(screen.queryByRole('button', { name: '잔액 반영' })).not.toBeInTheDocument()
  })

  it('실패 처리: 사유가 비면 보내지 않고, 서버 422는 모달을 열어 둔 채 칸에 붙인다', async () => {
    const bodies: unknown[] = []
    server.use(
      http.post(`${base}/${CHARGE_NOT_FOUND}/fail`, async ({ request }) => {
        bodies.push(await request.json())
        return problem(422, '요청 값이 올바르지 않습니다.', {
          errors: [{ path: 'reason', pointer: '/reason', detail: '사유는 200자 이하여야 합니다.' }],
        })
      }),
    )
    const user = renderDetail(CHARGE_NOT_FOUND)
    expect(await screen.findByText('결제 없음')).toBeInTheDocument()
    expect(button('잔액 반영')).toBeDisabled()
    expect(button('결제 취소')).toBeDisabled()

    await user.click(button('실패 처리'))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '실패 처리' }))
    expect(
      within(dialog).getByText('사유를 입력해 주세요. 충전 건 기록에 남아요'),
    ).toBeInTheDocument()
    expect(bodies).toHaveLength(0)

    await user.type(within(dialog).getByLabelText('사유'), '결제 없음')
    await user.click(within(dialog).getByRole('button', { name: '실패 처리' }))
    expect(await within(dialog).findByText('사유는 200자 이하여야 합니다.')).toBeInTheDocument()
    expect(bodies).toEqual([{ reason: '결제 없음' }])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('실패 처리하면 사유를 보내고 모달을 닫는다', async () => {
    const bodies: unknown[] = []
    server.use(
      http.post(`${base}/${CHARGE_NOT_FOUND}/fail`, async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({
          ...detailOf(CHARGE_NOT_FOUND).charge,
          status: ChargeStatus.FAILED,
        })
      }),
    )
    const user = renderDetail(CHARGE_NOT_FOUND)
    await user.click(await screen.findByRole('button', { name: '실패 처리' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('사유'), '결제 없음')
    await user.click(within(dialog).getByRole('button', { name: '실패 처리' }))
    expect(await screen.findByText('실패로 처리했어요')).toBeInTheDocument()
    expect(bodies).toEqual([{ reason: '결제 없음' }])
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('결제 취소는 사유를 쓴 뒤 확인 단계를 거쳐 보낸다', async () => {
    const bodies: unknown[] = []
    server.use(
      http.post(`${base}/${CHARGE_AFTER_FAILURE}/cancel-payment`, async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({
          ...detailOf(CHARGE_AFTER_FAILURE).charge,
          paymentCanceledAt: '2026-11-20T10:00:00',
        })
      }),
    )
    const user = renderDetail(CHARGE_AFTER_FAILURE)
    expect(await screen.findByText(/회원 돈만 빠졌어요/)).toBeInTheDocument()
    expect(button('잔액 반영')).toBeDisabled()
    expect(button('실패 처리')).toBeDisabled()

    await user.click(button('결제 취소'))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('사유'), '  승인된 결제 환불  ')
    await user.click(within(dialog).getByRole('button', { name: '다음' }))
    expect(within(dialog).getByText('정말 결제를 취소할까요?')).toBeInTheDocument()
    expect(
      within(dialog).getByText('회원 44에게 20,000원을 환불해요. 되돌릴 수 없어요.'),
    ).toBeInTheDocument()
    expect(bodies).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: '환불하기' }))
    expect(await screen.findByText('결제를 취소했어요. 회원에게 환불돼요')).toBeInTheDocument()
    expect(bodies).toEqual([{ reason: '승인된 결제 환불' }])
  })

  it('409면 서버 이유를 보이고 상세를 다시 받는다', async () => {
    const calls = countDetail(CHARGE_DONE)
    server.use(
      http.post(`${base}/${CHARGE_DONE}/complete`, () =>
        problem(409, '처리하는 사이 충전 건 상태가 바뀌었습니다. 현재 상태: COMPLETED'),
      ),
    )
    const user = renderDetail(CHARGE_DONE)
    await user.click(await screen.findByRole('button', { name: '잔액 반영' }))
    expect(
      await screen.findByText(
        '처리하는 사이 충전 건 상태가 바뀌었습니다. 현재 상태: COMPLETED 최신 상태를 다시 불러왔어요.',
      ),
    ).toBeInTheDocument()
    await waitFor(() => expect(calls.count).toBe(2))
  })

  it('결제 취소 503이면 모달을 열어 둔 채 다시 누르라고 안내하고 상세를 다시 받는다', async () => {
    const calls = countDetail(CHARGE_DONE)
    server.use(
      http.post(`${base}/${CHARGE_DONE}/cancel-payment`, () =>
        problem(503, '토스 결제 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'),
      ),
    )
    const user = renderDetail(CHARGE_DONE)
    await user.click(await screen.findByRole('button', { name: '결제 취소' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('사유'), '환불')
    await user.click(within(dialog).getByRole('button', { name: '다음' }))
    await user.click(within(dialog).getByRole('button', { name: '환불하기' }))
    expect(
      await within(dialog).findByText(
        '토스 답을 받지 못했어요. 잠시 뒤 다시 눌러 주세요. 결제 취소는 다시 눌러도 두 번 취소되지 않아요',
      ),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '환불하기' })).toBeInTheDocument()
    await waitFor(() => expect(calls.count).toBe(2))
  })

  it('토스 답이 UNKNOWN이면 처리 버튼 없이 다시 조회만 보인다', async () => {
    const calls = countDetail(CHARGE_UNKNOWN)
    const user = renderDetail(CHARGE_UNKNOWN)
    expect(await screen.findByText('토스 결제 상태를 모르고 있어요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '잔액 반영' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '실패 처리' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '결제 취소' })).not.toBeInTheDocument()

    await user.click(button('다시 조회'))
    await waitFor(() => expect(calls.count).toBe(2))
  })

  it('없는 충전 건(404)은 찾을 수 없다고 안내한다', async () => {
    renderDetail('CHG_missing')
    expect(await screen.findByText('충전 건을 찾을 수 없어요')).toBeInTheDocument()
  })

  it('처리 중 404가 오면 목록으로 돌아간다', async () => {
    server.use(
      http.post(`${base}/${CHARGE_DONE}/complete`, () =>
        problem(404, '충전 내역을 찾을 수 없습니다.'),
      ),
    )
    const user = renderDetail(CHARGE_DONE)
    await user.click(await screen.findByRole('button', { name: '잔액 반영' }))
    expect(
      await screen.findByText('충전 건을 찾을 수 없어 목록으로 돌아왔어요'),
    ).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: /멈춘 처리 중 건/ })).toBeInTheDocument()
  })
})
