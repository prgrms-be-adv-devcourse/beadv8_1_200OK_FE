import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole, ProductVisibility } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import {
  mySellerProducts,
  noReviewSentiments,
  reviewSentiments101,
  sellerProductDetail101,
} from '../fixtures'
import { SellerProductReviewsPage, SellerReviewsPage } from './SellerReviewPages'

// S-10 리뷰 분석: 내 상품 전부(GET /sellers/me/products) + 상품마다 GET …/review-sentiments를 합친다.
// 기본 핸들러의 상품 4개: 101(분석 18) · 106(30) · 109(3, 표본 부족) · 110(8). 판매자 전체 포장 언급 15개 중 부정 6개.
// S-11 상품 리뷰 분석: 상세 · 감성 · 공개 키워드 · 공개 리뷰 목록.

const problem = (status: number, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

const emptyPage = { content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 }

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/seller/reviews" element={<SellerReviewsPage />} />
        <Route path="/seller/reviews/:productId" element={<SellerProductReviewsPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const productTable = () => screen.findByRole('table', { name: '상품별 반응' })
const rowOf = (table: HTMLElement, name: string) =>
  within(table).getByRole('link', { name }).closest('tr') as HTMLElement

beforeEach(() => setAccessToken(fakeToken({ memberId: 7, role: MemberRole.SELLER })))
afterEach(() => clearAccessToken())

describe('리뷰 분석 (S-10)', () => {
  it('상품별 감성을 더해 전체 · 먼저 볼 항목 · 부정 비율 순 상품 표를 보인다', async () => {
    renderAt('/seller/reviews')

    const summary = within(await screen.findByRole('region', { name: '전체 반응' }))
    expect(summary.getByText(/분석 리뷰/)).toHaveTextContent('분석 리뷰 59개 · 상품 4개')
    expect(screen.getByText(/AI 분석, 참고용/)).toBeInTheDocument()

    const focus = screen.getByRole('region', { name: '먼저 볼 항목' })
    expect(focus).toHaveTextContent('포장 · 부정 40%')
    expect(focus).toHaveTextContent('언급한 리뷰 15개 중 6개가 부정이에요')

    const table = await productTable()
    const names = within(table)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(names).toEqual(['청송 꿀사과 부사', '청송 홍로 사과', '청송 사과즙 100% (30포)'])

    const apple = within(rowOf(table, '청송 꿀사과 부사'))
    expect(apple.getByRole('link')).toHaveAttribute('href', '/seller/reviews/101')
    // 맛 2/15 · 상품 상태 2/4 · 가격 언급 0
    const cells = apple.getAllByRole('cell').map((cell) => cell.textContent)
    expect(cells).toEqual([
      '청송 꿀사과 부사',
      '18개',
      '13%',
      '11%',
      '50%',
      '33%',
      '33%',
      '–',
      '상품 상태 부정 50%',
    ])
  })

  it('분석 리뷰 5개 미만 상품은 표에서 빼고 ‘리뷰가 더 모이면 보여요’에 이름과 개수만 보인다', async () => {
    renderAt('/seller/reviews')

    const thin = within(await screen.findByRole('region', { name: '리뷰가 더 모이면 보여요' }))
    expect(thin.getByRole('link', { name: /청송 꿀사과 부사 \(흠과·가정용\)/ })).toHaveTextContent(
      '분석 리뷰 3개',
    )
    expect(
      within(await productTable()).queryByRole('link', { name: '청송 꿀사과 부사 (흠과·가정용)' }),
    ).not.toBeInTheDocument()
  })

  it('상품이 100개를 넘으면 다음 쪽까지 받아 합친다', async () => {
    const pages: string[] = []
    server.use(
      http.get('*/api/v1/sellers/me/products', ({ request }) => {
        const params = new URL(request.url).searchParams
        pages.push(`${params.get('page')}/${params.get('size')}`)
        const page = Number(params.get('page'))
        return HttpResponse.json({
          content: [mySellerProducts[page]],
          page,
          size: 100,
          totalElements: 101,
          totalPages: 2,
        })
      }),
    )
    renderAt('/seller/reviews')

    const summary = await screen.findByRole('region', { name: '전체 반응' })
    expect(summary).toHaveTextContent('분석 리뷰 48개 · 상품 2개')
    expect(pages.sort()).toEqual(['0/100', '1/100'])
  })

  it('일부 상품의 반응을 못 받으면 알리고 합계는 불러온 상품 기준, 다시 시도는 실패한 것만 다시 받는다', async () => {
    const calls: Record<string, number> = {}
    let fail = true
    server.use(
      http.get('*/api/v1/sellers/me/products/:productId/review-sentiments', ({ params }) => {
        const id = String(params.productId)
        calls[id] = (calls[id] ?? 0) + 1
        if (id === '106' && fail) return problem(500, '서버 오류예요')
        return HttpResponse.json(id === '101' ? reviewSentiments101 : noReviewSentiments)
      }),
    )
    const user = renderAt('/seller/reviews')

    const alert = await screen.findByText('상품 1개의 반응을 못 불러왔어요')
    const summary = screen.getByRole('region', { name: '전체 반응' })
    expect(summary).toHaveTextContent('불러온 상품 기준')
    expect(summary).toHaveTextContent('분석 리뷰 18개 · 상품 3개')

    fail = false
    const box = alert.closest('[role="alert"]') ?? (alert.parentElement as HTMLElement)
    await user.click(within(box as HTMLElement).getByRole('button', { name: '다시 시도' }))

    await waitFor(() =>
      expect(screen.queryByText('상품 1개의 반응을 못 불러왔어요')).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('region', { name: '전체 반응' })).toHaveTextContent('상품 4개')
    expect(calls).toEqual({ '101': 1, '106': 2, '109': 1, '110': 1 })
  })

  it('등록한 상품이 없으면 상품 등록으로 안내한다', async () => {
    server.use(http.get('*/api/v1/sellers/me/products', () => HttpResponse.json(emptyPage)))
    renderAt('/seller/reviews')

    expect(await screen.findByText('등록한 상품이 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '상품 등록' })).toHaveAttribute(
      'href',
      '/seller/products/new',
    )
  })

  it('분석한 리뷰가 하나도 없으면 빈 상태를 보인다', async () => {
    server.use(
      http.get('*/api/v1/sellers/me/products/:productId/review-sentiments', () =>
        HttpResponse.json(noReviewSentiments),
      ),
    )
    renderAt('/seller/reviews')

    expect(await screen.findByText('아직 분석한 리뷰가 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '먼저 볼 항목' })).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('상품 목록을 못 받으면 오류와 다시 시도를 보인다', async () => {
    let calls = 0
    server.use(
      http.get('*/api/v1/sellers/me/products', () => {
        calls += 1
        return calls === 1
          ? problem(500, '상품 목록을 불러오지 못했어요')
          : HttpResponse.json({
              ...emptyPage,
              content: mySellerProducts,
              totalElements: 4,
              totalPages: 1,
            })
      }),
    )
    const user = renderAt('/seller/reviews')

    expect(await screen.findByText('상품 목록을 불러오지 못했어요')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByRole('region', { name: '전체 반응' })).toBeInTheDocument()
  })
})

describe('상품 리뷰 분석 (S-11)', () => {
  it('상품명 · 수정 링크 · 전체와 여섯 항목의 감성을 이름 · 개수 · 비율 문구로 보인다', async () => {
    let auth: string | null = null
    server.use(
      http.get('*/api/v1/sellers/me/products/101/review-sentiments', ({ request }) => {
        auth = request.headers.get('Authorization')
        return HttpResponse.json(reviewSentiments101)
      }),
    )
    renderAt('/seller/reviews/101')

    expect(await screen.findByRole('link', { name: '상품 수정' })).toHaveAttribute(
      'href',
      '/seller/products/101/edit',
    )
    expect(screen.getAllByText('청송 꿀사과 부사').length).toBeGreaterThan(0)

    const region = within(await screen.findByRole('region', { name: '리뷰 반응' }))
    expect(await region.findByText(/분석을 마친 리뷰 18개 기준/)).toBeInTheDocument()
    expect(auth).toMatch(/^Bearer /)

    const overall = within(
      region.getByRole('heading', { name: '전체' }).parentElement as HTMLElement,
    )
    expect(overall.getByText('긍정').nextSibling).toHaveTextContent('12개 · 67%')
    expect(overall.getByText('혼합').nextSibling).toHaveTextContent('1개 · 6%')

    const taste = region.getByRole('heading', { name: '맛' }).closest('li') as HTMLElement
    expect(within(taste).getByText('언급 15개')).toBeInTheDocument()
    expect(within(taste).getByText('긍정').nextSibling).toHaveTextContent('12개 · 80%')

    const price = region.getByRole('heading', { name: '가격' }).closest('li') as HTMLElement
    expect(within(price).getByText('이 항목을 말한 리뷰가 없어요')).toBeInTheDocument()
  })

  it('키워드를 누르면 그 키워드를 말한 리뷰만, 다시 누르면 전체를 보인다', async () => {
    const keywords: (string | null)[] = []
    server.use(
      http.get('*/api/v1/products/101/reviews', ({ request }) => {
        keywords.push(new URL(request.url).searchParams.get('keyword'))
        return undefined
      }),
    )
    const user = renderAt('/seller/reviews/101')

    const list = await screen.findByRole('region', { name: /^리뷰 \d/ })
    await waitFor(() => expect(list).toHaveTextContent('리뷰 3'))

    await user.click(await screen.findByRole('checkbox', { name: /달아요/ }))
    await waitFor(() =>
      expect(screen.getByRole('region', { name: /^리뷰 \d/ })).toHaveTextContent('리뷰 1'),
    )

    await user.click(screen.getByRole('checkbox', { name: /달아요/ }))
    await waitFor(() =>
      expect(screen.getByRole('region', { name: /^리뷰 \d/ })).toHaveTextContent('리뷰 3'),
    )
    expect(keywords).toEqual([null, 'C02'])
  })

  it('숨긴 상품은 키워드를 부르지 않고 안내만, 리뷰 목록이 404여도 오류 대신 안내를 보인다', async () => {
    let keywordCalls = 0
    server.use(
      http.get('*/api/v1/sellers/me/products/101', () =>
        HttpResponse.json({ ...sellerProductDetail101, visibility: ProductVisibility.HIDDEN }),
      ),
      http.get('*/api/v1/products/101/review-keywords', () => {
        keywordCalls += 1
        return problem(404, '상품을 찾을 수 없습니다.')
      }),
      http.get('*/api/v1/products/101/reviews', () => problem(404, '상품을 찾을 수 없습니다.')),
    )
    renderAt('/seller/reviews/101')

    expect(await screen.findByText(/숨긴 상품은 키워드를 볼 수 없어요/)).toBeInTheDocument()
    expect(await screen.findByText(/숨긴 상품은 리뷰 목록을 볼 수 없어요/)).toBeInTheDocument()
    expect(screen.queryByText('상품을 찾을 수 없습니다.')).not.toBeInTheDocument()
    expect(keywordCalls).toBe(0)
  })

  it('감성 집계를 못 받아도 키워드 · 리뷰는 보이고, 다시 시도로 다시 받는다', async () => {
    let calls = 0
    server.use(
      http.get('*/api/v1/sellers/me/products/101/review-sentiments', () => {
        calls += 1
        return calls === 1 ? problem(500, '서버 오류예요') : HttpResponse.json(reviewSentiments101)
      }),
    )
    const user = renderAt('/seller/reviews/101')

    const region = within(await screen.findByRole('region', { name: '리뷰 반응' }))
    expect(await region.findByText('서버 오류예요')).toBeInTheDocument()
    expect(await screen.findByRole('checkbox', { name: /달아요/ })).toBeInTheDocument()
    await user.click(region.getByRole('button', { name: '다시 시도' }))
    expect(await region.findByText(/분석을 마친 리뷰 18개 기준/)).toBeInTheDocument()
  })

  it('없거나 내 상품이 아니면 리뷰 분석으로 돌아가게 안내한다', async () => {
    renderAt('/seller/reviews/999')

    expect(await screen.findByText('상품을 찾을 수 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '리뷰 분석' })).toHaveAttribute(
      'href',
      '/seller/reviews',
    )
  })
})
