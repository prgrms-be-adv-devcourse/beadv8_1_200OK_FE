import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { problem } from '@/mocks/handlers/_shared'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { SEARCH_PERIOD_ORDER_MESSAGE } from '../errors'
import { untaggedProducts, zeroResultKeywords } from '../fixtures'
import { AdminSearchInsightsPage } from './AdminSearchInsightsPage'

const zeroUrl = '*/api/v1/admin/product-search/zero-result-keywords'
const untaggedUrl = '*/api/v1/admin/product-search/untagged-products'

function renderAt(path = '/admin/search-insights') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/search-insights" element={<AdminSearchInsightsPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

/** 요청 파라미터를 기록하고 body를 돌려준다 */
function record(url: string, body: unknown[]) {
  const requests: URLSearchParams[] = []
  server.use(
    http.get(url, ({ request }) => {
      requests.push(new URL(request.url).searchParams)
      return HttpResponse.json(body)
    }),
  )
  return requests
}

beforeEach(() => setAccessToken(fakeToken({ memberId: 1, role: MemberRole.ADMIN })))
afterEach(() => clearAccessToken())

describe('AdminSearchInsightsPage', () => {
  it('최근 7일(오늘 포함)과 개수 20을 파라미터로 보내고, 개수를 바꾸면 limit을 바꿔 다시 부른다', async () => {
    const requests = record(zeroUrl, zeroResultKeywords)
    const user = renderAt()
    const table = await screen.findByRole('table', { name: '0건 검색어 목록' })

    const today = dayjs().startOf('day')
    expect(requests[0]?.get('from')).toBe(today.subtract(6, 'day').format('YYYY-MM-DD'))
    expect(requests[0]?.get('to')).toBe(today.format('YYYY-MM-DD'))
    expect(requests[0]?.get('limit')).toBe('20')

    // 대표 원문 · 묶은 검색어 · 횟수
    expect(within(table).getByText('샤인 머스켓')).toBeInTheDocument()
    expect(within(table).getByText('묶은 검색어 샤인머스켓')).toBeInTheDocument()
    expect(within(table).getByText('12회')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('개수'), '50')
    await waitFor(() => expect(requests.at(-1)?.get('limit')).toBe('50'))
    expect(requests.at(-1)?.get('from')).toBe(requests[0]?.get('from'))
  })

  it('주소의 tab=untagged로 열면 태그 없는 상품만 같은 기간·개수로 부르고, 상품 상세 링크와 가장 높았던 태그·확률을 보여 준다', async () => {
    const zero = record(zeroUrl, zeroResultKeywords)
    const untagged = record(untaggedUrl, untaggedProducts)
    renderAt('/admin/search-insights?tab=untagged')
    const table = await screen.findByRole('table', { name: '태그 없는 상품 목록' })
    expect(screen.getByRole('tab', { name: '태그 없는 상품' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const today = dayjs().startOf('day')
    expect(untagged[0]?.get('from')).toBe(today.subtract(6, 'day').format('YYYY-MM-DD'))
    expect(untagged[0]?.get('to')).toBe(today.format('YYYY-MM-DD'))
    expect(untagged[0]?.get('limit')).toBe('20')
    expect(zero).toHaveLength(0)

    expect(within(table).getByRole('link', { name: '국산 생강 1kg' })).toHaveAttribute(
      'href',
      '/products/128',
    )
    expect(within(table).getByText('김장·김치용')).toBeInTheDocument()
    expect(within(table).getByText('83%')).toBeInTheDocument()
    // 기준(90%)에 못 미친 값은 올려서 90%로 보이지 않는다
    expect(within(table).getByText('89.9%')).toBeInTheDocument()
    expect(within(table).getByText('목록에서 빠진 태그')).toBeInTheDocument()
    expect(within(table).getByText('확률 기록이 없어요')).toBeInTheDocument()
  })

  it('빈 목록이면 기간을 넓혀 보라고 안내하고, 탭을 바꾸면 다른 목록을 부른다', async () => {
    record(zeroUrl, [])
    const untagged = record(untaggedUrl, [])
    const user = renderAt()
    expect(await screen.findByText('이 기간에는 0건 검색어가 없어요')).toBeInTheDocument()
    expect(untagged).toHaveLength(0)

    await user.click(screen.getByRole('tab', { name: '태그 없는 상품' }))
    expect(await screen.findByText('이 기간에는 태그 없는 상품이 없어요')).toBeInTheDocument()
    expect(untagged).toHaveLength(1)
  })

  it('보존 기간 밖(400)은 남아 있는 첫날을 해요체로 안내하고 다시 시도를 두지 않는다', async () => {
    server.use(
      http.get(zeroUrl, () =>
        problem(400, '시작일은 2026-08-22 이후여야 합니다.', {
          type: 'https://paldo.example/problems/search-log-period-beyond-retention',
        }),
      ),
    )
    renderAt()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      '검색어 기록은 2026.08.22(토)부터 남아 있어요. 시작일을 그 뒤로 골라 주세요',
    )
    expect(screen.queryByText(/이후여야 합니다/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
  })

  it('기간 순서 오류(400)는 type이 about:blank여도 detail로 알아보고 해요체로 안내한다', async () => {
    server.use(http.get(untaggedUrl, () => problem(400, '시작일은 종료일보다 늦을 수 없습니다.')))
    renderAt('/admin/search-insights?tab=untagged')
    expect(await screen.findByRole('alert')).toHaveTextContent(SEARCH_PERIOD_ORDER_MESSAGE)
  })

  it('서버 오류(5xx)는 다시 시도할 수 있다', async () => {
    let calls = 0
    server.use(
      http.get(zeroUrl, () => {
        calls += 1
        return calls === 1
          ? problem(500, '서버 내부 오류입니다.')
          : HttpResponse.json(zeroResultKeywords)
      }),
    )
    const user = renderAt()
    await user.click(await screen.findByRole('button', { name: '다시 시도' }))
    expect(await screen.findByRole('table', { name: '0건 검색어 목록' })).toBeInTheDocument()
  })
})
