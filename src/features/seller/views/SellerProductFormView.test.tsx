import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import {
  ProductCategory,
  ProductRegion,
  ProductStatus,
  ProductVisibility,
} from '@/shared/api/types'
import { render } from '@/test/render'
import { appleFormValues } from '../fixtures'
import { hasDescriptionContent, isUploadedProductImage } from '../productSchema'
import { SellerProductFormView, type SellerProductFormViewProps } from './SellerProductFormView'

const photos = [{ id: 'a', url: 'https://cdn.example/a.jpg' }]

function renderForm(props: Partial<SellerProductFormViewProps> = {}) {
  const onSubmit = vi.fn()
  render(
    <MemoryRouter>
      <SellerProductFormView
        mode="create"
        photos={[]}
        onAddPhotos={() => {}}
        onRemovePhoto={() => {}}
        onMovePhoto={() => {}}
        onDescriptionImageUpload={async () => ''}
        onSubmit={onSubmit}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onSubmit, user: userEvent.setup() }
}

describe('SellerProductFormView', () => {
  it('빈 폼을 저장하면 오류 요약을 보여 주고 저장하지 않는다', async () => {
    const { user, onSubmit } = renderForm()
    await user.click(screen.getByRole('button', { name: '등록하기' }))

    expect(await screen.findByText('입력값을 확인해 주세요. 저장되지 않았어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '상품명을 입력해 주세요' })).toHaveAttribute(
      'href',
      '#product-name',
    )
    expect(screen.getAllByText('상품 사진을 1장 이상 올려 주세요').length).toBeGreaterThan(0)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('API 요청 모양(descriptionHtml · imageUrls · 옵션)으로 넘긴다', async () => {
    const { user, onSubmit } = renderForm({ mode: 'edit', defaultValues: appleFormValues, photos })
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '청송 꿀사과 부사',
        category: ProductCategory.FRUIT,
        region: ProductRegion.GYEONGBUK,
        status: ProductStatus.ON_SALE,
        visibility: ProductVisibility.VISIBLE,
        imageUrls: ['https://cdn.example/a.jpg'],
        descriptionHtml: expect.stringMatching(/^<p>3대째/),
        options: [
          { id: 1011, name: '1kg (5~6과)', salePrice: 12900, listPrice: 14500, totalStock: 20 },
          { id: 1012, name: '2kg (11~13과)', salePrice: 23900, listPrice: 27000, totalStock: 11 },
          { id: 1013, name: '3kg (16~18과)', salePrice: 33900, listPrice: 38000, totalStock: 4 },
        ],
      }),
    )
  })

  it('옵션명이 겹치거나 정가가 판매가보다 작으면 막는다', async () => {
    const { user, onSubmit } = renderForm({
      photos,
      defaultValues: {
        ...appleFormValues,
        options: [
          { name: '2kg', salePrice: 23900, listPrice: 20000, totalStock: 5 },
          { name: '2kg', salePrice: 33900, totalStock: 3 },
        ],
      },
    })
    await user.click(screen.getByRole('button', { name: '등록하기' }))

    expect(
      await screen.findByRole('link', {
        name: '옵션 2: 옵션명이 겹쳐요. 다른 이름으로 바꿔 주세요',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '옵션 1: 정가는 판매가보다 크거나 같아야 해요' }),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('재고 0 뒤에 이어서 입력해도(011) 숫자 11로 넘기고, 비우면 입력해 달라고 한다', async () => {
    const { user, onSubmit } = renderForm({ photos })
    await user.type(screen.getByLabelText('상품명'), '청송 꿀사과')
    await user.type(screen.getByLabelText('설명'), '아삭한 사과예요')
    await user.type(screen.getByLabelText('옵션명'), '2kg')
    await user.type(screen.getByLabelText('판매가'), '23900')
    await user.type(screen.getByLabelText('재고'), '11')
    await user.click(screen.getByRole('button', { name: '등록하기' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ options: [{ name: '2kg', salePrice: 23900, totalStock: 11 }] }),
    )

    await user.clear(screen.getByLabelText('재고'))
    await user.click(screen.getByRole('button', { name: '등록하기' }))
    expect(
      await screen.findByRole('link', { name: '옵션 1: 재고를 입력해 주세요' }),
    ).toBeInTheDocument()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('마지막 옵션은 삭제할 수 없다', () => {
    renderForm()
    expect(screen.getByRole('button', { name: '옵션 1 삭제' })).toBeDisabled()
  })
})

describe('설명 HTML 검사', () => {
  it('빈 에디터 HTML은 비었다고 보고, 글자나 사진이 있으면 입력한 것으로 본다', () => {
    expect(hasDescriptionContent('')).toBe(false)
    expect(hasDescriptionContent('<p></p>')).toBe(false)
    expect(hasDescriptionContent('<p>&nbsp; </p><p><br></p>')).toBe(false)
    expect(hasDescriptionContent('<p>아삭해요</p>')).toBe(true)
    expect(
      hasDescriptionContent(
        '<p><img src="https://b.s3.ap-northeast-2.amazonaws.com/product/a.jpg"></p>',
      ),
    ).toBe(true)
  })

  it('우리 업로드 주소만 업로드한 사진으로 본다', () => {
    expect(
      isUploadedProductImage(
        'https://bucket.s3.ap-northeast-2.amazonaws.com/product/3f2a-9b1c.jpg',
      ),
    ).toBe(true)
    expect(isUploadedProductImage('data:image/png;base64,AAAA')).toBe(false)
    expect(isUploadedProductImage('https://example.com/a.jpg')).toBe(false)
    expect(
      isUploadedProductImage('https://bucket.s3.ap-northeast-2.amazonaws.com/product_review/a.jpg'),
    ).toBe(false)
  })
})
