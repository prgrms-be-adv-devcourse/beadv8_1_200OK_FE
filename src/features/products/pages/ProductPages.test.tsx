import { notifications } from '@mantine/notifications'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import {
  MemberRole,
  type ProductPage,
  type ProductSearchPage,
  type ProductSummary,
} from '@/shared/api/types'
import { MAX_CART_QUANTITY } from '@/shared/lib/constants'
import { NOT_CONNECTED_REASON } from '@/shared/ui'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import {
  appleReviewKeywords,
  appleReviews,
  MY_MEMBER_ID,
  productDetailOf,
  productSummaries,
} from '../fixtures'
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

const searchPageOf = (
  content: ProductSummary[],
  suggestion: string | null = null,
): ProductSearchPage => ({ ...pageOf(content, 0, 1), totalElements: content.length, suggestion })

/** 목록 요청의 검색 파라미터를 모은다. respond로 응답을 정한다 */
function recordProducts(respond: (params: URLSearchParams) => ProductSearchPage) {
  const requests: URLSearchParams[] = []
  server.use(
    http.get('*/api/v1/products', ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(params)
      return HttpResponse.json(respond(params))
    }),
  )
  return requests
}

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

describe('ProductListPage 검색·정렬', () => {
  beforeEach(() => server.use(categoriesHandler))

  it('검색어·정렬을 요청 파라미터로 보내고, 기본 정렬(관련도순)로 돌리면 sort를 빼고 첫 페이지부터 부른다', async () => {
    const apples = productSummaries.slice(0, 2)
    const requests = recordProducts(() => searchPageOf(apples))
    const { router, user } = renderAt('/products?q=사과&sort=PRICE_ASC&page=0')

    expect(
      await screen.findByRole('heading', { level: 1, name: '‘사과’ 검색 결과 2개' }),
    ).toBeInTheDocument()
    expect(Object.fromEntries(requests[0] ?? [])).toEqual({
      keyword: '사과',
      sort: 'PRICE_ASC',
      page: '0',
      size: '20',
    })

    const sort = screen.getByRole('combobox', { name: '정렬' })
    expect(
      within(sort)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['관련도순', '최신순', '낮은 가격순', '높은 가격순'])
    await user.selectOptions(sort, '관련도순')
    expect(router.state.location.search).toBe('?q=%EC%82%AC%EA%B3%BC')
    await vi.waitFor(() => expect(requests.at(-1)?.has('sort')).toBe(false))
    expect(requests.at(-1)?.get('keyword')).toBe('사과')

    await user.selectOptions(screen.getByRole('combobox', { name: '정렬' }), '높은 가격순')
    expect(router.state.location.search).toBe('?q=%EC%82%AC%EA%B3%BC&sort=PRICE_DESC')
    await vi.waitFor(() => expect(requests.at(-1)?.get('sort')).toBe('PRICE_DESC'))
  })

  it('검색어가 없으면 관련도순 없이 최신순이 기본이고, 정렬을 고르지 않으면 sort를 보내지 않는다', async () => {
    const requests = recordProducts(() => searchPageOf(productSummaries.slice(0, 1)))
    renderAt('/products?sort=RELEVANCE')

    await screen.findByText(productSummaries[0]?.name ?? '')
    expect(requests[0]?.has('sort')).toBe(false)
    expect(requests[0]?.has('keyword')).toBe(false)
    const sort = screen.getByRole('combobox', { name: '정렬' })
    expect(sort).toHaveValue('LATEST')
    expect(within(sort).queryByRole('option', { name: '관련도순' })).not.toBeInTheDocument()
  })

  it('검색 중에 산지를 바꾸면 검색어는 두고 첫 페이지부터 다시 부른다', async () => {
    const requests = recordProducts(() => searchPageOf(productSummaries.slice(0, 1)))
    const { router, user } = renderAt('/products?q=사과&page=2')

    await screen.findByText(productSummaries[0]?.name ?? '')
    await user.selectOptions(screen.getByRole('combobox', { name: '산지' }), 'JEJU')
    expect(router.state.location.search).toBe('?q=%EC%82%AC%EA%B3%BC&region=JEJU')
    await vi.waitFor(() =>
      expect(Object.fromEntries(requests.at(-1) ?? [])).toMatchObject({
        keyword: '사과',
        region: 'JEJU',
        page: '0',
      }),
    )
  })

  it('제안 링크를 누르면 제안어로 다시 검색하고, 제안이 없으면(null) 안내하지 않는다', async () => {
    const requests = recordProducts((params) =>
      params.get('keyword') === '고추가루'
        ? searchPageOf([], '고춧가루')
        : searchPageOf(productSummaries.slice(0, 1)),
    )
    const { router, user } = renderAt('/products?q=고추가루')

    expect(await screen.findByText(/찾으셨나요/)).toHaveTextContent('혹시 ‘고춧가루’를 찾으셨나요?')
    await user.click(screen.getByRole('link', { name: '‘고춧가루’ 검색 결과 보기' }))

    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('고춧가루')
    expect(
      await screen.findByRole('heading', { level: 1, name: '‘고춧가루’ 검색 결과 1개' }),
    ).toBeInTheDocument()
    expect(requests.at(-1)?.get('keyword')).toBe('고춧가루')
    expect(screen.queryByText(/찾으셨나요/)).not.toBeInTheDocument()
  })

  it('검색 결과가 0개면 철자를 확인하라고 안내하고 전체 상품으로 이끈다', async () => {
    recordProducts(() => searchPageOf([]))
    renderAt('/products?q=샤인머스캣')

    expect(await screen.findByText('‘샤인머스캣’과 맞는 상품이 없어요')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '‘샤인머스캣’ 검색 결과 0개' }))
    expect(screen.getByRole('link', { name: '전체 상품 보기' })).toHaveAttribute(
      'href',
      '/products',
    )
  })

  it('목록 위 검색창은 빈 검색어를 막고, 제출하면 필터 없이 새로 검색한다', async () => {
    recordProducts(() => searchPageOf(productSummaries.slice(0, 1)))
    const { router, user } = renderAt('/products?q=사과&category=FRUIT&sort=PRICE_ASC')

    const input = await screen.findByRole('searchbox', { name: '상품 검색어' })
    expect(input).toHaveValue('사과')
    await user.clear(input)
    await user.type(input, '   ')
    await user.click(screen.getByRole('button', { name: '검색' }))
    expect(screen.getByText('찾을 상품 이름을 입력해 주세요')).toBeInTheDocument()
    expect(input).toHaveFocus()
    const searchOf = () => Object.fromEntries(new URLSearchParams(router.state.location.search))
    expect(searchOf()).toEqual({ q: '사과', category: 'FRUIT', sort: 'PRICE_ASC' })

    await user.clear(input)
    await user.type(input, ' 고구마 {Enter}')
    expect(searchOf()).toEqual({ q: '고구마' })
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

describe('ProductDetailPage 리뷰 키워드', () => {
  const [mine, other, third] = appleReviews

  const reviewContents = (region: HTMLElement) =>
    within(region)
      .queryAllByRole('article')
      .map((article) => article.querySelector('p')?.textContent)

  const reviewsRegion = async () => {
    await screen.findByRole('heading', { level: 1, name: productDetailOf(101)?.name })
    return screen.getByRole('region', { name: /리뷰/ })
  }

  it('리뷰 키워드를 문구와 리뷰 수로 보여 준다', async () => {
    renderAt('/products/101')

    const group = await screen.findByRole('group', { name: '리뷰 키워드' })
    expect(within(group).getAllByRole('checkbox')).toHaveLength(appleReviewKeywords.keywords.length)
    for (const keyword of appleReviewKeywords.keywords) {
      expect(
        within(group).getByRole('checkbox', { name: `${keyword.phrase} ${keyword.reviewCount}` }),
      ).toBeInTheDocument()
    }
    expect(within(group).getByRole('checkbox', { name: '달아요 17' })).not.toBeChecked()
  })

  it('리뷰 키워드가 없으면 칩 영역을 보이지 않는다', async () => {
    const requested: string[] = []
    server.use(
      http.get('*/api/v1/products/:productId/review-keywords', ({ request }) => {
        requested.push(request.url)
        return HttpResponse.json({ analyzedReviewCount: 4, keywords: [] })
      }),
    )
    renderAt('/products/101')

    const region = await reviewsRegion()
    await within(region).findByText(other?.content ?? '')
    await vi.waitFor(() => expect(requested).toHaveLength(1))
    expect(screen.queryByRole('group', { name: '리뷰 키워드' })).not.toBeInTheDocument()
  })

  it('더 본 뒤 칩을 누르면 그 키워드로 0페이지부터 다시 부르고, 다시 누르면 전체로 돌아간다', async () => {
    const requests: URLSearchParams[] = []
    server.use(
      http.get('*/api/v1/products/:productId/reviews', ({ request }) => {
        const params = new URL(request.url).searchParams
        requests.push(params)
        if (params.get('keyword') === 'C02') return HttpResponse.json(pageOf([third], 0, 1))
        return params.get('page') === '0'
          ? HttpResponse.json(pageOf([mine, other], 0, 2))
          : HttpResponse.json(pageOf([third], 1, 2))
      }),
    )
    const { user } = renderAt('/products/101')

    const region = await reviewsRegion()
    await user.click(await within(region).findByRole('button', { name: '리뷰 더 보기' }))
    await within(region).findByText(third?.content ?? '')
    expect(requests.map((params) => [params.get('page'), params.has('keyword')])).toEqual([
      ['0', false],
      ['1', false],
    ])

    await user.click(within(region).getByRole('checkbox', { name: '달아요 17' }))
    expect(within(region).getByRole('checkbox', { name: '달아요 17' })).toBeChecked()
    await vi.waitFor(() => expect(reviewContents(region)).toEqual([third?.content]))
    const filtered = requests.at(-1)
    expect(filtered?.get('keyword')).toBe('C02')
    expect(filtered?.get('page')).toBe('0')
    expect(within(region).queryByRole('button', { name: '리뷰 더 보기' })).not.toBeInTheDocument()

    const before = requests.length
    await user.click(within(region).getByRole('checkbox', { name: '달아요 17' }))
    expect(within(region).getByRole('checkbox', { name: '달아요 17' })).not.toBeChecked()
    await vi.waitFor(() =>
      expect(reviewContents(region)).toEqual([mine?.content, other?.content, third?.content]),
    )
    expect(requests.slice(before).filter((params) => params.has('keyword'))).toEqual([])
  })

  it('키워드로 거르지 못하면(400) 선택을 풀라고 안내하고 칩은 그대로 둔다', async () => {
    server.use(
      http.get('*/api/v1/products/:productId/reviews', ({ request }) =>
        new URL(request.url).searchParams.has('keyword')
          ? problem(400, '리뷰 키워드를 찾을 수 없습니다.')
          : HttpResponse.json(pageOf(appleReviews, 0, 1)),
      ),
    )
    const { user } = renderAt('/products/101')

    const region = await reviewsRegion()
    await user.click(await within(region).findByRole('checkbox', { name: '아삭해요 12' }))

    expect(await within(region).findByRole('alert')).toHaveTextContent(
      '키워드 선택을 풀고 전체 리뷰를 봐 주세요.',
    )
    const group = within(region).getByRole('group', { name: '리뷰 키워드' })
    expect(within(group).getByRole('checkbox', { name: '아삭해요 12' })).toBeChecked()
  })

  it('리뷰 키워드를 못 불러와도(404) 칩만 빼고 리뷰는 보여 준다', async () => {
    let keywordsRequested = false
    server.use(
      http.get('*/api/v1/products/:productId/review-keywords', () => {
        keywordsRequested = true
        return problem(404, '상품을 찾을 수 없습니다.')
      }),
    )
    renderAt('/products/101')

    const region = await reviewsRegion()
    await within(region).findByText(other?.content ?? '')
    await vi.waitFor(() => expect(keywordsRequested).toBe(true))
    expect(screen.queryByRole('group', { name: '리뷰 키워드' })).not.toBeInTheDocument()
    expect(within(region).queryByRole('alert')).not.toBeInTheDocument()
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
    server.events.removeAllListeners()
  })

  it('비회원이면 담지 않고 로그인 안내를 띄운다', async () => {
    let posted = false
    server.use(
      http.post('*/api/v1/cart/items', () => {
        posted = true
        return HttpResponse.json({ cartItemId: 1, quantity: 1 }, { status: 201 })
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
        return HttpResponse.json({ cartItemId: 1, quantity: 1 }, { status: 201 })
      }),
    )
    const { user } = renderAt('/products/101')

    await user.click(await addButton())
    expect(await screen.findByText('장바구니에 담았어요')).toBeInTheDocument()
    expect(bodies).toEqual([{ productOptionId: 1011, quantity: 1 }])
  })

  it('이미 담긴 옵션이면 서버가 더한 수량(200)을 알리고, 다른 요청은 보내지 않는다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    const added = [3, MAX_CART_QUANTITY]
    const sent: string[] = []
    server.events.on('request:start', ({ request }) => {
      if (request.method !== 'GET') sent.push(`${request.method} ${new URL(request.url).pathname}`)
    })
    server.use(
      http.post('*/api/v1/cart/items', () =>
        HttpResponse.json({ cartItemId: 5, quantity: added.shift() }, { status: 200 }),
      ),
    )
    const { user } = renderAt('/products/101')

    await user.click(await addButton())
    expect(
      await screen.findByText('이미 담긴 상품이라 수량을 더했어요. 지금 3개 담겨 있어요'),
    ).toBeInTheDocument()
    await user.click(await addButton())
    expect(
      await screen.findByText(`이미 담긴 상품이라 최대 수량(${MAX_CART_QUANTITY}개)까지 담았어요`),
    ).toBeInTheDocument()
    expect(sent).toEqual(['POST /api/v1/cart/items', 'POST /api/v1/cart/items'])
  })

  it('판매 중이 아닌 상품(409)이면 서버 문구를 알린다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    server.use(http.post('*/api/v1/cart/items', () => problem(409, '판매 중인 상품이 아닙니다.')))
    const { user } = renderAt('/products/101')

    await user.click(await addButton())
    expect(await screen.findByText('판매 중인 상품이 아닙니다.')).toBeInTheDocument()
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
