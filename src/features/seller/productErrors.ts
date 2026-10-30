import type { FieldPath } from 'react-hook-form'
import type { ApiError } from '@/shared/api/ApiError'
import type { ProductFormValues } from './productSchema'

// 상품 등록·수정 실패 → 폼에 보여 줄 모양 (DECISIONS.md A-13: 서버 detail 우선)
// - 422 errors[].path는 RHF 경로로 바꿔 칸에 붙인다: options[0].salePrice → options.0.salePrice, descriptionHtml → description
//   칸이 없는 경로(imageUrls 등)와 errors 없는 422(판매가 > 정가, 업로드하지 않은 이미지)는 폼 위 문구로
// - 수정 409는 version 불일치면 충돌 안내, 옵션명 중복("같은 이름의 옵션")이면 문구로
// - 401 · 403 · 그 밖의 오류도 서버 detail을 폼 위 문구로

export type ProductFormFailure = {
  message: string | null
  fieldErrors?: Partial<Record<FieldPath<ProductFormValues>, string>>
  conflict: boolean
}

const formField = /^(name|description|options\.\d+\.(name|salePrice|listPrice|totalStock))$/

const isFormField = (path: string): path is FieldPath<ProductFormValues> => formField.test(path)

export function toFormPath(serverPath: string): string {
  const path = serverPath.replace(/\[(\d+)\]/g, '.$1')
  return path === 'descriptionHtml' ? 'description' : path
}

export function toProductFormFailure(error: ApiError | null): ProductFormFailure {
  if (!error) return { message: null, conflict: false }
  if (error.status === 409 && !error.detail.includes('옵션')) {
    return { message: null, conflict: true }
  }
  const fieldErrors: Partial<Record<FieldPath<ProductFormValues>, string>> = {}
  const rest: string[] = []
  for (const { path, detail } of error.errors) {
    const formPath = toFormPath(path)
    if (isFormField(formPath)) fieldErrors[formPath] ??= detail
    else rest.push(detail)
  }
  const hasFields = Object.keys(fieldErrors).length > 0
  return {
    conflict: false,
    fieldErrors: hasFields ? fieldErrors : undefined,
    message: rest.length > 0 ? rest.join(' ') : hasFields ? null : error.detail,
  }
}
