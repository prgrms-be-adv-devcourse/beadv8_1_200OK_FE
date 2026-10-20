import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import {
  MemberRole,
  ProductStatus,
  ProductVisibility,
  type SellerProductDetail,
} from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { mySellerProducts, sellerProductDetail101 } from '../fixtures'
import { SellerProductFormPage, SellerProductsPage } from './SellerWorkPages'

const S3 = 'https://bucket.s3.ap-northeast-2.amazonaws.com/product'
const MEMBER_ID = 7

/** 상품 관리 목록(데스크톱 표) */
const table = () => screen.findByRole('table', { name: '상품 목록' })

const problem = (status: number, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

/** 수정 화면이 받는 상세. 서버가 version을 올렸다고 보려고 version만 바꿔 쓴다 */
const detail = (over: Partial<SellerProductDetail> = {}): SellerProductDetail => ({
  ...sellerProductDetail101,
  imageUrls: [`${S3}/saved.jpg`],
  ...over,
})

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/seller/products" element={<SellerProductsPage />} />
        <Route path="/seller/products/new" element={<SellerProductFormPage />} />
        <Route path="/seller/products/:productId/edit" element={<SellerProductFormPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

beforeEach(() => {
  setAccessToken(fakeToken({ memberId: MEMBER_ID, role: MemberRole.SELLER }))
})

afterEach(() => clearAccessToken())

describe('상품 관리 목록', () => {
  it('내 상품 목록 API(Bearer)로 그리고, 탭은 status로 다시 받는다', async () => {
    const requests: { params: URLSearchParams; auth: string | null }[] = []
    server.use(
      http.get('*/api/v1/sellers/me/products', ({ request }) => {
        const params = new URL(request.url).searchParams
        requests.push({ params, auth: request.headers.get('Authorization') })
        const status = params.get('status')
        const list = mySellerProducts.filter((p) => !status || p.status === status)
        return HttpResponse.json({
          content: list,
          page: 0,
          size: 20,
          totalElements: list.length,
          totalPages: 1,
        })
      }),
    )
    const user = renderAt('/seller/products')

    const rows = within(await table())
      .getAllByRole('row')
      .slice(1)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toHaveTextContent('청송 꿀사과 부사')
    expect(rows[0]).toHaveTextContent('12,900')
    expect(rows[0]).toHaveTextContent(`판매 가능 수량이 5개 이하예요`)
    expect(rows[3]).toHaveTextContent('품절')
    expect(requests[0]?.auth).toMatch(/^Bearer /)
    expect(requests[0]?.params.get('page')).toBe('0')
    expect(requests[0]?.params.get('size')).toBe('20')
    expect(requests[0]?.params.has('status')).toBe(false)

    await user.click(screen.getByRole('tab', { name: /판매 중/ }))
    await waitFor(() => expect(requests.at(-1)?.params.get('status')).toBe(ProductStatus.ON_SALE))
    expect(
      within(await table())
        .getAllByRole('row')
        .slice(1),
    ).toHaveLength(2)
  })

  it('판매 중지 → PATCH status PAUSED → 목록을 다시 받는다', async () => {
    const patches: unknown[] = []
    let listCount = 0
    server.use(
      http.get('*/api/v1/sellers/me/products', () => {
        listCount += 1
        return HttpResponse.json({
          content: mySellerProducts,
          page: 0,
          size: 20,
          totalElements: 4,
          totalPages: 1,
        })
      }),
      http.patch('*/api/v1/products/101/status', async ({ request }) => {
        patches.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = renderAt('/seller/products')
    const t = await table()
    const before = listCount

    await user.click(within(t).getByRole('button', { name: '청송 꿀사과 부사 판매 중지' }))

    await waitFor(() => expect(patches).toEqual([{ status: ProductStatus.PAUSED }]))
    expect(await screen.findByText('판매 상태를 바꿨어요')).toBeInTheDocument()
    await waitFor(() => expect(listCount).toBeGreaterThan(before))
  })

  it('노출 스위치를 끄면 PATCH visibility HIDDEN, 실패하면 서버 detail을 보여 준다', async () => {
    const patches: unknown[] = []
    server.use(
      http.patch('*/api/v1/products/101/visibility', async ({ request }) => {
        patches.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
      http.patch('*/api/v1/products/106/visibility', () =>
        problem(409, '다른 요청이 먼저 상품을 바꿨습니다.'),
      ),
    )
    const user = renderAt('/seller/products')
    const t = await table()

    await user.click(within(t).getByRole('switch', { name: '청송 꿀사과 부사 노출' }))
    await waitFor(() => expect(patches).toEqual([{ visibility: ProductVisibility.HIDDEN }]))
    expect(await screen.findByText('숨겼어요')).toBeInTheDocument()

    await user.click(within(t).getByRole('switch', { name: '청송 사과즙 100% (30포) 노출' }))
    expect(await screen.findByText('다른 요청이 먼저 상품을 바꿨습니다.')).toBeInTheDocument()
  })

  it('모든 상품에 수정 링크가 있다', async () => {
    renderAt('/seller/products')
    const t = await table()
    for (const product of mySellerProducts) {
      expect(within(t).getByRole('link', { name: `${product.name} 수정` })).toHaveAttribute(
        'href',
        `/seller/products/${product.productId}/edit`,
      )
    }
  })
})

describe('상품 등록', () => {
  it('사진을 올리는 동안은 막고, 다 올리면 서버 url만 보내 등록한다', async () => {
    let finishUpload: () => void = () => {}
    let body: unknown
    let headers: Headers | undefined
    server.use(
      http.post('*/api/v1/media/:purpose', async () => {
        await new Promise<void>((resolve) => {
          finishUpload = resolve
        })
        return HttpResponse.json({ mediaId: 1, url: `${S3}/a.jpg` }, { status: 201 })
      }),
      http.post('*/api/v1/products', async ({ request }) => {
        body = await request.json()
        headers = request.headers
        return HttpResponse.json({ productId: 77 }, { status: 201 })
      }),
    )
    const user = renderAt('/seller/products/new')

    await user.type(screen.getByLabelText('상품명'), '청송 꿀사과')
    await user.type(screen.getByLabelText('설명'), '아삭한 사과예요')
    await user.type(screen.getByLabelText('옵션명'), '2kg')
    await user.type(screen.getByLabelText('판매가'), '23900')
    await user.type(screen.getByLabelText('재고'), '11')
    await user.upload(
      screen.getByLabelText('상품 사진 파일 고르기'),
      new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
    )

    const submit = screen.getByRole('button', { name: '등록하기' })
    expect(submit).toBeDisabled()
    expect(submit).toHaveAccessibleDescription('사진을 다 올린 뒤 등록할 수 있어요')

    finishUpload()
    await waitFor(() => expect(submit).toBeEnabled())
    await user.click(submit)

    await table()
    expect(body).toMatchObject({
      name: '청송 꿀사과',
      descriptionHtml: '<p>아삭한 사과예요</p>',
      imageUrls: [`${S3}/a.jpg`],
      options: [{ name: '2kg', salePrice: 23900, totalStock: 11 }],
    })
    expect(headers?.get('Authorization')).toMatch(/^Bearer /)
    expect(headers?.get('X-Member-Id')).toBeNull()
  })

  it('422 errors[].path(options[0].salePrice)를 그 칸에 붙이고 focus한다', async () => {
    server.use(
      http.post('*/api/v1/products', () =>
        problem(422, '요청 값이 올바르지 않습니다.', {
          errors: [
            {
              detail: '판매가는 1억 원 이하여야 합니다.',
              pointer: '/options/0/salePrice',
              path: 'options[0].salePrice',
            },
          ],
        }),
      ),
      http.post('*/api/v1/media/:purpose', () =>
        HttpResponse.json({ mediaId: 1, url: `${S3}/a.jpg` }, { status: 201 }),
      ),
    )
    const user = renderAt('/seller/products/new')
    await user.type(screen.getByLabelText('상품명'), '청송 꿀사과')
    await user.type(screen.getByLabelText('설명'), '아삭한 사과예요')
    await user.type(screen.getByLabelText('옵션명'), '2kg')
    await user.type(screen.getByLabelText('판매가'), '23900')
    await user.upload(
      screen.getByLabelText('상품 사진 파일 고르기'),
      new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
    )
    const submit = screen.getByRole('button', { name: '등록하기' })
    await waitFor(() => expect(submit).toBeEnabled())
    await user.click(submit)

    expect(
      await screen.findByRole('link', { name: '옵션 1: 판매가는 1억 원 이하여야 합니다.' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('판매가')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('판매가')).toHaveFocus()
  })
})

describe('상품 수정', () => {
  const useDetail = (...details: SellerProductDetail[]) => {
    let call = 0
    server.use(
      http.get('*/api/v1/sellers/me/products/101', () => {
        const next = details[Math.min(call, details.length - 1)]
        call += 1
        return HttpResponse.json(next)
      }),
    )
  }

  it('판매자 상세(Bearer)로 채우고, 상세의 version·옵션 id·상태·노출을 그대로 보낸다', async () => {
    const bodies: unknown[] = []
    let auth: string | null = null
    useDetail(detail({ version: 5, visibility: ProductVisibility.HIDDEN }))
    server.use(
      http.get('*/api/v1/sellers/me/products/101', ({ request }) => {
        auth = request.headers.get('Authorization')
        return HttpResponse.json(detail({ version: 5, visibility: ProductVisibility.HIDDEN }))
      }),
      http.put('*/api/v1/products/101', async ({ request }) => {
        bodies.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = renderAt('/seller/products/101/edit')

    expect(await screen.findByDisplayValue('청송 꿀사과 부사')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '저장' }))

    await table()
    expect(auth).toMatch(/^Bearer /)
    expect(bodies[0]).toMatchObject({
      version: 5,
      status: ProductStatus.ON_SALE,
      visibility: ProductVisibility.HIDDEN,
      imageUrls: [`${S3}/saved.jpg`],
      options: [
        { id: 1011, name: '1kg (5~6과)', salePrice: 12900, totalStock: 20 },
        { id: 1012, totalStock: 11 },
        { id: 1013, totalStock: 4 },
      ],
    })
    expect(JSON.stringify(bodies[0])).not.toContain('allocatedQuantity')
  })

  it('409면 충돌 안내 → 최신 내용 불러오기로 상세를 다시 받고, 새 version으로 저장한다', async () => {
    const bodies: { version: number }[] = []
    useDetail(detail({ version: 3 }), detail({ version: 4, name: '다른 곳에서 고친 이름' }))
    server.use(
      http.put('*/api/v1/products/101', async ({ request }) => {
        const body = (await request.json()) as { version: number }
        bodies.push(body)
        return body.version === 3
          ? problem(409, '다른 사용자가 이미 정보를 수정했습니다. 새로고침 후 다시 시도해주세요.')
          : new HttpResponse(null, { status: 204 })
      }),
    )
    const user = renderAt('/seller/products/101/edit')

    await user.click(await screen.findByRole('button', { name: '저장' }))
    expect(await screen.findByText('다른 곳에서 먼저 수정한 상품이에요')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '최신 내용 불러오기' }))
    expect(await screen.findByDisplayValue('다른 곳에서 고친 이름')).toBeInTheDocument()
    expect(screen.queryByText('다른 곳에서 먼저 수정한 상품이에요')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '저장' }))
    await table()
    expect(bodies.map((b) => b.version)).toEqual([3, 4])
  })

  it('총재고를 주문에 배정된 수량보다 적게 줄이면 보내지 않고 그 칸에 안내한다', async () => {
    let puts = 0
    server.use(
      http.put('*/api/v1/products/101', () => {
        puts += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = renderAt('/seller/products/101/edit')

    const stock = (await screen.findAllByLabelText('재고'))[0] as HTMLElement
    expect(await screen.findByText('주문에 배정된 6개보다 적게 줄일 수 없어요')).toBeInTheDocument()
    await user.clear(stock)
    await user.type(stock, '5')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(stock).toHaveAttribute('aria-invalid', 'true')
    expect(stock).toHaveFocus()
    expect(puts).toBe(0)
  })

  it.each([
    [404, '상품을 찾을 수 없어요'],
    [403, '내 상품이 아니라서 수정할 수 없어요'],
  ])('상세가 %i이면 안내하고 상품 관리로 돌아가게 한다', async (status, title) => {
    server.use(http.get('*/api/v1/sellers/me/products/99', () => problem(status, '서버 문구')))
    renderAt('/seller/products/99/edit')
    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '상품 관리' })).toHaveAttribute(
      'href',
      '/seller/products',
    )
  })
})
