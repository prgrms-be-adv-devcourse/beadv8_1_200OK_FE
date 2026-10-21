import { isApiError } from '@/shared/api/ApiError'
import type { InfoFormValues } from './schemas'

// 내 정보 수정 실패를 화면 자리로 나눈다. 문구는 서버 detail을 그대로 쓴다.
// - 422 errors[].path name·nickname → 그 칸
// - 404(탈퇴한 회원)·401·5xx·네트워크 → 폼 위 문구

export type InfoSubmitErrors = {
  fields?: Partial<Record<keyof InfoFormValues, string>>
  message?: string
}

export function infoErrorMessage(error: unknown): string {
  if (!isApiError(error)) return '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'
  if (error.status === 404) return '내 정보를 찾을 수 없어요. 탈퇴했거나 없는 계정이에요'
  return error.detail
}

export function toInfoSubmitErrors(error: unknown): InfoSubmitErrors {
  if (!error) return {}
  if (!isApiError(error) || error.status !== 422) return { message: infoErrorMessage(error) }
  const paths = error.fieldErrors
  const fields: InfoSubmitErrors['fields'] = {}
  if (paths.name) fields.name = paths.name
  if (paths.nickname) fields.nickname = paths.nickname
  return Object.keys(fields).length > 0 ? { fields } : { message: error.detail }
}

// 기본 배송지 저장 실패. 422 errors[].path postalCode는 화면 칸 이름 zipCode로 바꿔 붙인다.
export type AddressSubmitErrors = {
  fields?: Partial<
    Record<'recipientName' | 'recipientPhone' | 'zipCode' | 'address' | 'addressDetail', string>
  >
  message?: string
}

export function addressErrorMessage(error: unknown): string {
  return isApiError(error) ? error.detail : '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'
}

export function toAddressSubmitErrors(error: unknown): AddressSubmitErrors {
  if (!error) return {}
  if (!isApiError(error) || error.status !== 422) return { message: addressErrorMessage(error) }
  const paths = error.fieldErrors
  const fields: NonNullable<AddressSubmitErrors['fields']> = {}
  if (paths.recipientName) fields.recipientName = paths.recipientName
  if (paths.recipientPhone) fields.recipientPhone = paths.recipientPhone
  if (paths.postalCode) fields.zipCode = paths.postalCode
  if (paths.address) fields.address = paths.address
  if (paths.addressDetail) fields.addressDetail = paths.addressDetail
  return Object.keys(fields).length > 0 ? { fields } : { message: error.detail }
}
