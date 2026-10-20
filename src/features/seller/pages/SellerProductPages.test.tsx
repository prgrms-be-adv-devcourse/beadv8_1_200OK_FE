import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import {
  MemberRole,
  ProductCategory,
  ProductRegion,
  ProductStatus,
  ProductVisibility,
} from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { mySellerProducts } from '../fixtures'
import { type CachedProduct, PATCH_VERSION_STEP } from '../productCache'
import { SellerProductFormPage, SellerProductsPage } from './SellerWorkPages'

const S3 = 'https://bucket.s3.ap-northeast-2.amazonaws.com/product'
const MEMBER_ID = 7
const CACHE_KEY = `paldo.seller.products.${MEMBER_ID}`

/** 상품 관리 목록(데스크톱 표) */
const table = () => screen.findByRole('table', { name: '상품 목록' })

const problem = (status: number, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

const saved: CachedProduct = {
  productId: 31,
  version: 2,
  name: '청송 꿀사과',
  descriptionHtml: '<p>아삭한 사과예요</p>',
  category: ProductCategory.FRUIT,
  region: ProductRegion.GYEONGBUK,
  status: ProductStatus.ON_SALE,
  visibility: ProductVisibility.HIDDEN,
  imageUrls: [`${S3}/saved.jpg`],
  options: [{ name: '2kg', salePrice: 23900, listPrice: 27000, totalStock: 11 }],
  updatedAt: '2026-10-18T10:00:00',
}

/** 101은 fixtures에서 이 기기에서 등록한 상품 */
const cached101: CachedProduct = { ...saved, productId: 101, name: '청송 꿀사과 부사' }

const storedVersion = (productId: number) =>
  (JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]') as CachedProduct[]).find(
    (p) => p.productId === productId,
  )?.version

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
  localStorage.clear()
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

  it('판매 중지 → PATCH status PAUSED → 목록을 다시 받고, 캐시 version을 올린다', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify([cached101]))
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
    expect(storedVersion(101)).toBe(cached101.version + PATCH_VERSION_STEP)
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

  it('이 기기에 없는 상품은 수정을 막고 이유를 보여 준다', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify([cached101]))
    renderAt('/seller/products')
    const t = await table()
    const editable = within(t).getByRole('link', { name: '청송 꿀사과 부사 수정' })
    expect(editable).toHaveAttribute('href', '/seller/products/101/edit')
    const blocked = within(t).getByRole('button', { name: '청송 사과즙 100% (30포) 수정' })
    expect(blocked).toBeDisabled()
    expect(blocked).toHaveAccessibleDescription(
      '이 기기에서 등록하거나 고친 상품만 수정할 수 있어요',
    )
    expect(within(t).queryByRole('link', { name: '청송 홍로 사과' })).not.toBeInTheDocument()
  })
})

describe('상품 등록', () => {
  it('사진을 올리는 동안은 막고, 다 올리면 서버 url만 보내 등록한 상품을 캐시에 남긴다', async () => {
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
    expect(storedVersion(77)).toBe(0)
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
  beforeEach(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify([saved]))
  })

  it('저장해 둔 version으로 보내고, 409면 충돌 안내 → 최신 내용 불러오기로 폼을 다시 그린다', async () => {
    let body: unknown
    server.use(
      // 숨긴 상품은 구매자 상세가 404
      http.get('*/api/v1/products/31', () => problem(404, '상품을 찾을 수 없습니다.')),
      http.put('*/api/v1/products/31', async ({ request }) => {
        body = await request.json()
        return problem(
          409,
          '다른 사용자가 이미 정보를 수정했습니다. 새로고침 후 다시 시도해주세요.',
        )
      }),
    )
    const user = renderAt('/seller/products/31/edit')

    expect(await screen.findByDisplayValue('청송 꿀사과')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('다른 곳에서 먼저 수정한 상품이에요')).toBeInTheDocument()
    expect(body).toMatchObject({
      version: 2,
      status: ProductStatus.ON_SALE,
      visibility: ProductVisibility.HIDDEN,
      imageUrls: [`${S3}/saved.jpg`],
    })

    await user.clear(screen.getByLabelText('상품명'))
    await user.type(screen.getByLabelText('상품명'), '고치던 이름')
    await user.click(screen.getByRole('button', { name: '최신 내용 불러오기' }))

    expect(await screen.findByDisplayValue('청송 꿀사과')).toBeInTheDocument()
    expect(screen.queryByText('다른 곳에서 먼저 수정한 상품이에요')).not.toBeInTheDocument()
  })

  it('공개 상품은 서버 상세로 옵션 id를 맞추고, 저장하면 version을 올려 둔다', async () => {
    const bodies: unknown[] = []
    server.use(
      http.get('*/api/v1/products/31', () =>
        HttpResponse.json({
          productId: 31,
          name: '청송 꿀사과',
          descriptionHtml: '<p>아삭한 사과예요</p>',
          categoryGroup: 'AGRICULTURE',
          category: ProductCategory.FRUIT,
          region: ProductRegion.GYEONGBUK,
          status: ProductStatus.ON_SALE,
          imageUrls: [`${S3}/saved.jpg`],
          options: [
            {
              optionId: 501,
              name: '2kg',
              listPrice: 27000,
              salePrice: 23900,
              discountRate: 11,
              soldOut: false,
            },
          ],
        }),
      ),
      http.put('*/api/v1/products/31', async ({ request }) => {
        bodies.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = renderAt('/seller/products/31/edit')

    await user.click(await screen.findByRole('button', { name: '저장' }))

    await table()
    expect(bodies[0]).toMatchObject({
      version: 2,
      visibility: ProductVisibility.VISIBLE,
      options: [{ id: 501, name: '2kg', salePrice: 23900, totalStock: 11 }],
    })
    expect(storedVersion(31)).toBe(3)
  })

  it('이 기기에 없는 상품은 고칠 수 없다고 안내한다 (version 0으로 보내지 않는다)', async () => {
    localStorage.clear()
    renderAt('/seller/products/99/edit')
    expect(await screen.findByText('이 상품은 여기서 수정할 수 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '상품 관리' })).toHaveAttribute(
      'href',
      '/seller/products',
    )
  })
})
