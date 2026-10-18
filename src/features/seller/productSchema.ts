import { z } from 'zod'
import {
  ProductCategory,
  ProductRegion,
  ProductStatus,
  ProductVisibility,
} from '@/shared/api/types'

// 상품 등록·수정 검증. 규칙은 Bruno ProductCreateRequest 그대로(✅ POST /products, PUT /products/{id}).
// 사진(imageUrls 1~10장)은 업로드 상태라 폼 밖에서 검사한다.

export const PRICE_MAX = 100_000_000
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
    description: z.string().trim().min(1, '상품 설명을 입력해 주세요'),
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

/** 설명 입력(줄바꿈 글) → 서버 descriptionHtml. 서버가 저장할 때 다시 정제한다 */
export function textToHtml(text: string) {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  return text
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** 서버 descriptionHtml → 설명 입력 글 (수정 화면 처음 값) */
export function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim()
}
