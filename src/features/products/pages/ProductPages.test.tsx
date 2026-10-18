import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole, type ProductPage, type ProductSummary } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { appleReviews, MY_MEMBER_ID, productDetailOf, productSummaries } from '../fixtures'
import { ProductDetailPage } from './ProductDetailPage'
import { ProductListPage } from './ProductListPage'

const problem = (status: number, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/api/v1/products' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

const pageOf = <T,>(content: T[], page: number, totalPages: number): ProductPage<T> => ({
  content,
  page,
  size: 20,
  totalElements: totalPages * 20,
  totalPages,
})

const categoriesHandler = http.get('*/api/v1/products/categories', () =>
  HttpResponse.json([
    {
      group: 'AGRICULTURE',
      description: '농산물',
      categories: [{ code: 'FRUIT', description: '과일' }],
    },
  ]),
)

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/products', Component: ProductListPage },
      { path: '/products/:productId', Component: ProductDetailPage },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return { router, user: userEvent.setup() }
}

afterEach(() => clearAccessToken())

describe('ProductListPage', () => {
  it('URL 필터를 요청 파라미터로 보내고, 산지를 바꾸면 첫 페이지부터 다시 부른다', async () => {
    const requests: URLSearchParams[] = []
    server.use(
      categoriesHandler,
      http.get('*/api/v1/products', ({ request }) => {
        const params = new URL(request.url).searchParams
        requests.push(params)
        const page = Number(params.get('page'))
        const items: ProductSummary[] = productSummaries.slice(page * 2, page * 2 + 2)
        return HttpResponse.json(pageOf(items, page, 2))
      }),
    )
    const { router, user } = renderAt('/products?category=FRUIT&region=GYEONGBUK')

    expect(await screen.findByText(productSummaries[0]?.name ?? '')).toBeInTheDocument()
    expect(Object.fromEntries(requests[0] ?? [])).toEqual({
      category: 'FRUIT',
      region: 'GYEONGBUK',
      page: '0',
      size: '20',
    })

    // 더 보기 → 다음 페이지를 받은 뒤 URL에 page를 남긴다
    await user.click(screen.getByRole('button', { name: '상품 더 보기' }))
    expect(await screen.findByText(productSummaries[2]?.name ?? '')).toBeInTheDocument()
    expect(router.state.location.search).toContain('page=1')
    expect(requests.at(-1)?.get('page')).toBe('1')
    expect(screen.queryByRole('button', { name: '상품 더 보기' })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: '산지' }), 'JEJU')
    expect(router.state.location.search).toBe('?category=FRUIT&region=JEJU')
    await screen.findByText(productSummaries[0]?.name ?? '')
    expect(Object.fromEntries(requests.at(-1) ?? [])).toMatchObject({ region: 'JEJU', page: '0' })
  })

  it('목록을 못 불러오면 서버 문구와 다시 시도를 보여 준다', async () => {
    let fail = true
    server.use(
      categoriesHandler,
      http.get('*/api/v1/products', () =>
        fail
          ? problem(500, '일시적인 오류가 발생했습니다.')
          : HttpResponse.json(pageOf(productSummaries.slice(0, 1), 0, 1)),
      ),
    )
    const { user } = renderAt('/products')

    expect(await screen.findByRole('alert')).toHaveTextContent('일시적인 오류가 발생했습니다.')
    fail = false
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText(productSummaries[0]?.name ?? '')).toBeInTheDocument()
  })
})

describe('ProductDetailPage', () => {
  it('없는 상품(404)은 상품을 찾을 수 없다고 알린다', async () => {
    server.use(
      http.get('*/api/v1/products/:productId', () => problem(404, '상품을 찾을 수 없습니다.')),
    )
    renderAt('/products/999')

    expect(await screen.findByText('상품을 찾을 수 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '상품 둘러보기' })).toHaveAttribute('href', '/products')
  })

  it('로그인했으면 이 상품의 내 리뷰를 목록 맨 위에 두고 내 리뷰를 붙인다', async () => {
    setAccessToken(fakeToken({ memberId: MY_MEMBER_ID, role: MemberRole.BUYER }))
    const detail = productDetailOf(101)
    const [myReview, ...others] = appleReviews
    const myOldReview = { ...myReview, reviewId: 4001, content: '작년에 산 것도 맛있었어요.' }
    server.use(
      http.get('*/api/v1/products/:productId', () => HttpResponse.json(detail)),
      http.get('*/api/v1/products/:productId/reviews/me', () =>
        HttpResponse.json([myReview, myOldReview]),
      ),
      http.get('*/api/v1/products/:productId/reviews', ({ request }) => {
        expect(new URL(request.url).searchParams.get('page')).toBe('0')
        return HttpResponse.json(pageOf(appleReviews, 0, 2))
      }),
    )
    renderAt('/products/101')

    expect(await screen.findByRole('heading', { level: 1, name: detail?.name })).toBeInTheDocument()
    const reviews = screen.getByRole('region', { name: /리뷰/ })
    await within(reviews).findByText(myOldReview.content)
    const contents = within(reviews)
      .getAllByRole('article')
      .map((article) => article.querySelector('p')?.textContent)
    // 내 리뷰 2개가 먼저, 목록에 같이 온 내 리뷰는 한 번만
    expect(contents).toEqual([
      myReview?.content,
      myOldReview.content,
      ...others.map((review) => review.content),
    ])
    expect(within(reviews).getAllByText('내 리뷰')).toHaveLength(2)
  })

  it('리뷰 목록만 실패하면 상품은 그대로 두고 리뷰 자리에 오류를 보여 준다', async () => {
    server.use(
      http.get('*/api/v1/products/:productId', () => HttpResponse.json(productDetailOf(101))),
      http.get('*/api/v1/products/:productId/reviews', () =>
        problem(503, '리뷰를 잠시 불러올 수 없습니다.'),
      ),
    )
    renderAt('/products/101')

    const reviews = await screen.findByRole('region', { name: /리뷰/ })
    expect(await within(reviews).findByRole('alert')).toHaveTextContent(
      '리뷰를 잠시 불러올 수 없습니다.',
    )
    expect(screen.getAllByRole('button', { name: '장바구니 담기' }).length).toBeGreaterThan(0)
  })
})
