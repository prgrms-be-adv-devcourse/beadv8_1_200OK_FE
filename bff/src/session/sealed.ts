import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// 세션은 백엔드와 같이 쓰는 데이터용 Redis(AOF)에 들어간다. 디스크·백업·다른 계정에는 암호문만 남게 한다 (ADR-0007)
// 앞의 버전은 나중에 키를 여러 개 받게 될 때 어떤 키로 잠갔는지 가리키는 자리다
const VERSION = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16

/** 세션 ID를 AAD로 묶어, 값을 다른 세션 키로 옮겨 붙이면 열리지 않게 한다 */
export function seal(key: Uint8Array, id: string, plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv).setAAD(Buffer.from(id))
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ])
  return `${VERSION}.${iv.toString('base64url')}.${encrypted.toString('base64url')}`
}

/** 키가 바뀌었거나 값이 깨졌으면 null — 세션이 없는 것으로 보고 다시 로그인하게 한다 */
export function unseal(key: Uint8Array, id: string, value: string): string | null {
  const parts = value.split('.')
  const [version, iv = '', encrypted = ''] = parts
  if (parts.length !== 3 || version !== VERSION) return null
  const bytes = Buffer.from(encrypted, 'base64url')
  if (bytes.length <= TAG_BYTES) return null
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64url'), {
      authTagLength: TAG_BYTES,
    })
      .setAAD(Buffer.from(id))
      .setAuthTag(bytes.subarray(-TAG_BYTES))
    return Buffer.concat([
      decipher.update(bytes.subarray(0, -TAG_BYTES)),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}
