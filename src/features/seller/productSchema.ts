import { z } from 'zod'
import {
  ProductCategory,
  ProductRegion,
  ProductStatus,
  ProductVisibility,
} from '@/shared/api/types'

// 상품 등록·수정 검증. 규칙은 Bruno ProductCreateRequest 그대로(✅ POST /products, PUT /products/{id}).
// 사진(imageUrls 1~10장)은 업로드 상태라 폼 밖에서 검사한다.
// 설명(description)은 에디터가 만든 HTML 그대로 descriptionHtml로 보낸다. 서버가 정제하고, 정제 뒤 10만 자까지 받는다.

export const PRICE_MAX = 100_000_000
/** 설명 HTML 최대 길이. 요청은 20만 자까지지만 정제 뒤 10만 자를 넘으면 422라 10만 자로 막는다 */
export const DESCRIPTION_HTML_MAX = 100_000

/** 에디터 HTML에 글자나 사진이 있는지 (빈 에디터도 <p></p>를 낼 수 있다) */
export function hasDescriptionContent(html: string) {
  if (/<img\s/i.test(html)) return true
  const text = html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return text.length > 0
}
export const OPTION_MAX = 50

const option = z.object({
  id: z.number().optional(),
  name: z
    .string()
    .trim()
    .min(1, '옵션명을 입력해 주세요')
    .max(100, '옵션명은 100자 이하로 입력해 주세요'),
  salePrice: z
    .number({ message: '판매가를 입력해 주세요' })
    .int()
    .min(1, '판매가를 입력해 주세요')
    .max(PRICE_MAX, '판매가는 1억 원 이하로 입력해 주세요'),
  listPrice: z.number().int().max(PRICE_MAX, '정가는 1억 원 이하로 입력해 주세요').optional(),
  totalStock: z
    .number({ message: '재고를 입력해 주세요' })
    .int()
    .min(0, '재고는 0 이상이어야 해요'),
})

export const productSchema = z
  .object({
    category: z.enum(ProductCategory),
    name: z
      .string()
      .trim()
      .min(1, '상품명을 입력해 주세요')
      .max(100, '상품명은 100자 이하로 입력해 주세요'),
    region: z.enum(ProductRegion),
    description: z
      .string()
      .refine(hasDescriptionContent, '상품 설명을 입력해 주세요')
      .refine(
        (html) => html.length <= DESCRIPTION_HTML_MAX,
        '상품 설명이 너무 길어요. 서식이나 표를 줄여 주세요',
      ),
    options: z
      .array(option)
      .min(1, '옵션은 1개 이상 있어야 해요')
      .max(OPTION_MAX, `옵션은 ${OPTION_MAX}개까지 만들 수 있어요`),
    status: z.enum(ProductStatus),
    visibility: z.enum(ProductVisibility),
  })
  .superRefine((value, ctx) => {
    const seen = new Map<string, number>()
    value.options.forEach((opt, i) => {
      const key = opt.name.trim()
      if (key && seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', i, 'name'],
          message: '옵션명이 겹쳐요. 다른 이름으로 바꿔 주세요',
        })
      }
      seen.set(key, i)
      if (opt.listPrice !== undefined && opt.listPrice < opt.salePrice) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', i, 'listPrice'],
          message: '정가는 판매가보다 크거나 같아야 해요',
        })
      }
    })
  })

export type ProductFormValues = z.infer<typeof productSchema>

/** 상세설명 에디터에 넣을 수 있는 사진 형식 (서버 업로드와 같음) */
export const DESCRIPTION_IMAGE_TYPES = ['image/jpeg', 'image/png']

/** 우리 업로드(POST /media/PRODUCT)가 준 주소인지. 서버는 이 주소의 이미지만 남긴다 */
export function isUploadedProductImage(src: string) {
  return /^https:\/\/[^/]+\.amazonaws\.com\/product\/[A-Za-z0-9-]+\.[A-Za-z0-9]+$/.test(src)
}
