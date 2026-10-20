import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import type { OrderDetail, ProductReview } from '@/shared/api/types'
import { OrderItemStatus, OrderStatus, ReviewMediaType } from '@/shared/api/types'
import { render } from '@/test/render'
import { ReviewEditPage, ReviewNewPage } from './ReviewPages'

const S3 = 'https://bucket.s3.ap-northeast-2.amazonaws.com/product_review'

const product = {
  productId: 1,
  name: '청송 꿀사과',
  imageUrls: [],
  options: [{ optionId: 11, name: '3kg', listPrice: 40000, salePrice: 32000 }],
}

const savedReview: ProductReview = {
  reviewId: 5,
  productId: 1,
  productOptionId: 11,
  optionName: '3kg',
  memberId: 2,
  rating: 9,
  content: '아삭하고 단맛이 진해요. 또 살게요.',
  media: [
    { type: ReviewMediaType.IMAGE, url: `${S3}/a.jpg` },
    { type: ReviewMediaType.IMAGE, url: `${S3}/b.jpg` },
  ],
  createdAt: '2026-10-12T10:20:00',
  updatedAt: '2026-10-12T10:20:00',
}

// 주문 100의 주문 상품 345(구매확정) → 상품 1 · 옵션 11
const orderItem = {
  orderItemId: 345,
  productId: 1,
  productOptionId: 11,
  productName: '청송 꿀사과',
  productOptionName: '3kg',
  unitPrice: 32000,
  quantity: 1,
  itemAmount: 32000,
  status: OrderItemStatus.PURCHASE_CONFIRMED,
}

const order: OrderDetail = {
  orderId: 100,
  status: OrderStatus.PAID,
  orderedAt: '2026-10-01T10:00:00',
  recipientName: '이서연',
  recipientPhone: '010-2468-1357',
  zipCode: '04524',
  address: '서울 중구 세종대로 110',
  addressDetail: '',
  sellerGroups: [{ sellerId: 7, shippingFee: 0, remoteAreaFee: 0, items: [orderItem] }],
  totalProductAmount: 32000,
  totalShippingFee: 0,
  totalRemoteAreaFee: 0,
  totalAmount: 32000,
}

const orderOf = (status: OrderItemStatus) => ({
  ...order,
  sellerGroups: order.sellerGroups.map((g) => ({
    ...g,
    items: g.items.map((i) => ({ ...i, status })),
  })),
})

const NEW_PATH = '/reviews/new?orderId=100&orderItemId=345'

const problem = (status: number, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

/** 상품 1·주문 100 기본 응답. 덮을 응답은 overrides로(먼저 등록한 것이 뒤에 오므로 여기서 앞에 둔다) */
function renderAt(path: string, ...overrides: RequestHandler[]) {
  server.use(
    ...overrides,
    http.get('*/api/v1/products/:productId', () => HttpResponse.json(product)),
    http.get('*/api/v1/orders/100', () => HttpResponse.json(order)),
  )
  const router = createMemoryRouter(
    [
      { path: '/reviews/new', element: <ReviewNewPage /> },
      { path: '/reviews/:reviewId/edit', element: <ReviewEditPage /> },
      { path: '/products/:productId', element: <p>상품 상세 화면</p> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return { router, user: userEvent.setup() }
}

async function fillReview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: '별점 5점' }))
  await user.type(screen.getByLabelText('어떤 점이 좋았나요?'), '달고 시원해서 아침마다 마셔요.')
}

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

describe('ReviewNewPage', () => {
  it('올린 사진 url을 mediaUrls로 넣어 작성하고 완료 화면을 보여 준다', async () => {
    let body: unknown
    let productId: unknown
    server.use(
      http.post('*/api/v1/media/:purpose', () =>
        HttpResponse.json({ mediaId: 1, url: `${S3}/new.jpg` }, { status: 201 }),
      ),
      http.post('*/api/v1/products/:productId/reviews', async ({ request, params }) => {
        productId = params.productId
        body = await request.json()
        return HttpResponse.json({ reviewId: 9 }, { status: 201 })
      }),
    )
    const { user } = renderAt(NEW_PATH)

    expect(await screen.findByText('청송 꿀사과')).toBeInTheDocument()
    await fillReview(user)
    await user.upload(
      screen.getByLabelText('사진·영상 (선택) 파일 고르기'),
      new File(['x'], 'apple.jpg', { type: 'image/jpeg' }),
    )
    await waitFor(() => expect(screen.getByRole('button', { name: '등록하기' })).not.toBeDisabled())
    await user.click(screen.getByRole('button', { name: '등록하기' }))

    expect(await screen.findByText('리뷰를 등록했어요')).toBeInTheDocument()
    expect(productId).toBe('1')
    expect(body).toEqual({
      productOptionId: 11,
      orderId: 100,
      orderItemId: 345,
      rating: 10,
      content: '달고 시원해서 아침마다 마셔요.',
      mediaUrls: [`${S3}/new.jpg`],
    })
  })

  it('검증 실패(422)는 errors[].path 칸에 서버 문구를 붙이고 그 칸으로 focus한다', async () => {
    server.use(
      http.post('*/api/v1/products/:productId/reviews', () =>
        problem(422, '요청 값이 올바르지 않습니다.', {
          errors: [
            {
              detail: '리뷰 내용은 2,000자 이하여야 합니다.',
              pointer: '/content',
              path: 'content',
            },
          ],
        }),
      ),
    )
    const { user } = renderAt(NEW_PATH)
    await fillReview(user)
    await user.click(screen.getByRole('button', { name: '등록하기' }))

    expect(await screen.findByText('리뷰 내용은 2,000자 이하여야 합니다.')).toBeInTheDocument()
    expect(screen.getByLabelText('어떤 점이 좋았나요?')).toHaveFocus()
  })

  it('첨부 URL 오류(422, errors 없음)는 사진·영상 칸에 보여 준다', async () => {
    server.use(
      http.post('*/api/v1/products/:productId/reviews', () =>
        problem(422, '업로드한 리뷰 첨부 주소가 아닙니다.', {
          type: 'product/invalid-review-media-url',
        }),
      ),
    )
    const { user } = renderAt(NEW_PATH)
    await fillReview(user)
    await user.click(screen.getByRole('button', { name: '등록하기' }))

    const message = await screen.findByText('업로드한 리뷰 첨부 주소가 아닙니다.')
    // 폼 위가 아니라 사진·영상 칸에 연결된 문구 하나
    expect(document.querySelector(`[aria-describedby="${message.id}"]`)).not.toBeNull()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it.each([
    [409, '이 주문에서 이미 리뷰를 작성한 상품입니다.'],
    [401, '로그인이 필요합니다.'],
  ])('%i 응답은 폼 위에 서버 문구로 보여 준다', async (status, detail) => {
    server.use(http.post('*/api/v1/products/:productId/reviews', () => problem(status, detail)))
    const { user } = renderAt(NEW_PATH)
    await fillReview(user)
    await user.click(screen.getByRole('button', { name: '등록하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(detail)
  })

  it.each(['/reviews/new', '/reviews/new?orderItemId=345', '/reviews/new?orderId=100'])(
    '%s 처럼 주문·주문 상품 번호가 없으면 주문 내역으로 안내한다',
    async (path) => {
      renderAt(path)
      expect(await screen.findByText('리뷰를 쓸 주문 상품을 찾지 못했어요')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '주문 내역' })).toHaveAttribute('href', '/orders')
    },
  )

  it('주문이 없으면(404) 주문 내역으로 안내한다', async () => {
    renderAt(
      NEW_PATH,
      http.get('*/api/v1/orders/100', () => problem(404, '주문을 찾을 수 없습니다.')),
    )
    expect(await screen.findByText('주문을 찾지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '주문 내역' })).toHaveAttribute('href', '/orders')
  })

  it('주문에 없는 주문 상품이면 알려 준다', async () => {
    renderAt('/reviews/new?orderId=100&orderItemId=999')
    expect(
      await screen.findByText('이 주문에서 리뷰를 쓸 상품을 찾지 못했어요'),
    ).toBeInTheDocument()
  })

  it('구매확정 전 상품이면 리뷰를 쓸 수 없다고 알려 준다', async () => {
    renderAt(
      NEW_PATH,
      http.get('*/api/v1/orders/100', () => HttpResponse.json(orderOf(OrderItemStatus.DELIVERED))),
    )
    expect(await screen.findByText('구매확정한 상품만 리뷰를 쓸 수 있어요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '등록하기' })).not.toBeInTheDocument()
  })

  it('주문을 불러오지 못하면 서버 문구와 다시 시도를 보여 준다', async () => {
    let fail = true
    const { user } = renderAt(
      NEW_PATH,
      http.get('*/api/v1/orders/100', () =>
        fail ? problem(500, '주문을 불러오지 못했습니다.') : HttpResponse.json(order),
      ),
    )
    expect(await screen.findByText('주문을 불러오지 못했습니다.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('청송 꿀사과')).toBeInTheDocument()
  })
})

describe('ReviewEditPage', () => {
  const myReviews = (content: ProductReview[]) =>
    http.get('*/api/v1/reviews/me', () =>
      HttpResponse.json({
        content,
        page: 0,
        size: 100,
        totalElements: content.length,
        totalPages: 1,
      }),
    )

  it('내 리뷰 목록에서 찾아 채우고, 남긴 첨부만 mediaUrls로 보내 고친다', async () => {
    let body: unknown
    server.use(
      myReviews([{ ...savedReview, reviewId: 6 }, savedReview]),
      http.put('*/api/v1/reviews/:reviewId', async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderAt('/reviews/5/edit')

    expect(await screen.findByText('4.5점')).toBeInTheDocument()
    expect(screen.getByText('청송 꿀사과')).toBeInTheDocument()
    expect(screen.getByLabelText('어떤 점이 좋았나요?')).toHaveValue(savedReview.content)

    await user.click(screen.getByRole('button', { name: '사진·영상 (선택) 1 삭제' }))
    await user.click(screen.getByRole('button', { name: '수정하기' }))

    expect(await screen.findByText('리뷰를 고쳤어요')).toBeInTheDocument()
    expect(body).toEqual({ rating: 9, content: savedReview.content, mediaUrls: [`${S3}/b.jpg`] })
  })

  it('삭제하면 상품 상세 리뷰로 이동한다', async () => {
    let deleted: unknown
    server.use(
      myReviews([savedReview]),
      http.delete('*/api/v1/reviews/:reviewId', ({ params }) => {
        deleted = params.reviewId
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { router, user } = renderAt('/reviews/5/edit')

    await user.click(await screen.findByRole('button', { name: '삭제' }))
    const dialog = await screen.findByRole('dialog', { name: '리뷰를 삭제할까요?' })
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))

    expect(await screen.findByText('상품 상세 화면')).toBeInTheDocument()
    expect(deleted).toBe('5')
    expect(router.state.location).toMatchObject({
      pathname: '/products/1',
      hash: '#product-reviews',
    })
  })

  it('삭제 실패(403)는 확인 창 안에 서버 문구로 보여 준다', async () => {
    server.use(
      myReviews([savedReview]),
      http.delete('*/api/v1/reviews/:reviewId', () =>
        problem(403, '리뷰를 수정하거나 삭제할 권한이 없습니다.'),
      ),
    )
    const { user } = renderAt('/reviews/5/edit')

    await user.click(await screen.findByRole('button', { name: '삭제' }))
    const dialog = await screen.findByRole('dialog', { name: '리뷰를 삭제할까요?' })
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '리뷰를 수정하거나 삭제할 권한이 없습니다.',
    )
  })

  it('내 리뷰 목록에 없으면 찾지 못했다고 알려 준다', async () => {
    server.use(myReviews([{ ...savedReview, reviewId: 3 }]))
    renderAt('/reviews/5/edit')
    expect(await screen.findByText('리뷰를 찾지 못했어요')).toBeInTheDocument()
  })
})
