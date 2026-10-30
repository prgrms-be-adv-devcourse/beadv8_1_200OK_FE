import { notifications } from '@mantine/notifications'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole, type ProductPage, type ProductSummary } from '@/shared/api/types'
import { NOT_CONNECTED_REASON } from '@/shared/ui'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { appleReviews, MY_MEMBER_ID, productDetailOf, productSummaries } from '../fixtures'
import { HomePage } from './HomePage'
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
      { path: '/', Component: HomePage },
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

describe('ProductDetailPage 장바구니 담기', () => {
  const addButton = async () => {
    const [add] = await screen.findAllByRole('button', { name: '장바구니 담기' })
    if (!add) throw new Error('담기 버튼 없음')
    return add
  }

  afterEach(() => {
    localStorage.clear()
    notifications.clean()
  })

  it('비회원이면 담지 않고 로그인 안내를 띄운다', async () => {
    let posted = false
    server.use(
      http.post('*/api/v1/cart/items', () => {
        posted = true
        return HttpResponse.json({ cartItemId: 1 }, { status: 201 })
      }),
    )
    const { user } = renderAt('/products/101')

    await user.click(await addButton())
    expect(await screen.findByText('로그인하고 장바구니에 담아 보세요.')).toBeInTheDocument()
    expect(posted).toBe(false)
  })

  it('로그인했으면 고른 옵션·수량을 담고 알린다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    const bodies: unknown[] = []
    server.use(
      http.post('*/api/v1/cart/items', async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({ cartItemId: 1 }, { status: 201 })
      }),
    )
    const { user } = renderAt('/products/101')

    await user.click(await addButton())
    expect(await screen.findByText('장바구니에 담았어요')).toBeInTheDocument()
    expect(bodies).toEqual([{ productOptionId: 1011, quantity: 1 }])
  })

  it('이미 담긴 옵션(409)이면 담긴 수량에 더하고, 장바구니에 없으면 서버 문구를 알린다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    let inCart = true
    const patched: unknown[] = []
    server.use(
      http.post('*/api/v1/cart/items', () =>
        problem(409, inCart ? '이미 장바구니에 담긴 상품입니다.' : '판매 중인 상품이 아닙니다.'),
      ),
      http.get('*/api/v1/cart', () =>
        HttpResponse.json({
          cartId: 1,
          items: inCart
            ? [{ cartItemId: 5, productOptionId: 1011, quantity: 2, selected: true }]
            : [],
        }),
      ),
      http.patch('*/api/v1/cart/items/:cartItemId', async ({ request, params }) => {
        patched.push({ cartItemId: params.cartItemId, ...((await request.json()) as object) })
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderAt('/products/101')

    await user.click(await addButton())
    expect(await screen.findByText('이미 담긴 상품이라 수량을 더했어요')).toBeInTheDocument()
    expect(patched).toEqual([{ cartItemId: '5', quantity: 3 }])

    inCart = false
    await user.click(await addButton())
    expect(await screen.findByText('판매 중인 상품이 아닙니다.')).toBeInTheDocument()
    expect(patched).toHaveLength(1)
  })
})

describe('관심·팔로우·판매자 정보 (연결 전)', () => {
  it('홈은 상품 카드에 하트를 그리지 않고 인기 농가 자리에 연결 전 안내를 보여 준다', async () => {
    renderAt('/')
    expect(await screen.findByText(productSummaries[0]?.name ?? '')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /관심 상품/ })).not.toBeInTheDocument()
    expect(screen.getByText('인기 농가는 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /팔로우/ })).not.toBeInTheDocument()
  })

  it('상품 목록은 카드에 하트를 그리지 않는다', async () => {
    server.use(categoriesHandler)
    renderAt('/products')
    expect(await screen.findByText(productSummaries[0]?.name ?? '')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /관심 상품/ })).not.toBeInTheDocument()
  })

  it('상품 상세는 판매자 정보 대신 연결 전 안내를, 관심·팔로우는 막고 이유를 보여 준다', async () => {
    server.use(
      http.get('*/api/v1/products/:productId', () => HttpResponse.json(productDetailOf(101))),
    )
    renderAt('/products/101')

    expect(await screen.findByText('판매자 정보는 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /햇살농원/ })).not.toBeInTheDocument()
    for (const like of screen.getAllByRole('button', { name: '관심 상품' })) {
      expect(like).toBeDisabled()
      expect(like).toHaveAccessibleDescription(NOT_CONNECTED_REASON)
    }
    const follow = screen.getByRole('button', { name: '팔로우' })
    expect(follow).toBeDisabled()
    expect(follow).toHaveAccessibleDescription(NOT_CONNECTED_REASON)
  })
})
