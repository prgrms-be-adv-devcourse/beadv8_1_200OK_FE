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

// 비밀번호 변경 실패. 400·409는 problem type의 마지막 조각(member/...)으로 나눈다.
// - 400 invalid-current-password → 현재 비밀번호 칸, same-as-current-password → 새 비밀번호 칸
// - 422 errors[].path currentPassword·newPassword → 그 칸
// - 409 password-changed-concurrently → 폼 위 문구(다른 요청이 먼저 바꿔 이 세션의 토큰도 이미 무효)
// - 404(탈퇴한 회원)·5xx·네트워크 → 폼 위 문구. 401은 apiClient가 세션을 끝내고 로그인으로 보낸다
export type PasswordSubmitErrors = {
  fields?: Partial<Record<'currentPassword' | 'newPassword', string>>
  message?: string
}

export const PASSWORD_CHANGED_CONCURRENTLY_MESSAGE =
  '다른 곳에서 비밀번호가 먼저 바뀌었어요. 바뀐 비밀번호로 다시 로그인한 뒤 시도해 주세요'

const hasProblemType = (type: string | null, slug: string) => Boolean(type?.endsWith(`/${slug}`))

export function toPasswordSubmitErrors(error: unknown): PasswordSubmitErrors {
  if (!error) return {}
  if (!isApiError(error)) return { message: infoErrorMessage(error) }
  if (error.status === 400) {
    if (hasProblemType(error.type, 'member/invalid-current-password')) {
      return { fields: { currentPassword: '현재 비밀번호가 맞지 않아요' } }
    }
    if (hasProblemType(error.type, 'member/same-as-current-password')) {
      return { fields: { newPassword: '지금 비밀번호와 다른 비밀번호로 정해 주세요' } }
    }
  }
  if (error.status === 409) return { message: PASSWORD_CHANGED_CONCURRENTLY_MESSAGE }
  if (error.status === 422) {
    const paths = error.fieldErrors
    const fields: NonNullable<PasswordSubmitErrors['fields']> = {}
    if (paths.currentPassword) fields.currentPassword = paths.currentPassword
    if (paths.newPassword) fields.newPassword = paths.newPassword
    if (Object.keys(fields).length > 0) return { fields }
  }
  return { message: infoErrorMessage(error) }
}
