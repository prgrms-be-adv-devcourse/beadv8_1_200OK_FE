// 다음(카카오) 우편번호 서비스. 키 없이 브라우저에서 스크립트를 불러 쓴다.
// 가이드: https://postcode.map.daum.net/guide — 스크립트 주소가 바뀌면 이 상수만 고친다.
// 1단계부터 쓸 수 있는 화면 기능이고, 서버 API와는 상관없다.

const SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

/** 고른 주소 (도로명 주소 우선, 없으면 지번) */
export type PostcodeResult = { zipCode: string; address: string }

type DaumPostcodeData = {
  zonecode: string
  roadAddress: string
  jibunAddress: string
  buildingName: string
  apartment: 'Y' | 'N'
}

type DaumPostcodeOptions = { oncomplete: (data: DaumPostcodeData) => void }

declare global {
  interface Window {
    daum?: { Postcode: new (options: DaumPostcodeOptions) => { open: () => void } }
  }
}

let loading: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.daum?.Postcode) return Promise.resolve()
  if (loading) return loading
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('우편번호 서비스를 불러오지 못했어요'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/** 도로명 주소 + (아파트면) 건물명. 다음 가이드의 예시 규칙 */
function toAddress(data: DaumPostcodeData): string {
  const base = data.roadAddress || data.jibunAddress
  return data.apartment === 'Y' && data.buildingName ? `${base} (${data.buildingName})` : base
}

/**
 * 우편번호 찾기 창을 연다. 스크립트를 불러와 창을 띄우면 끝나고(그동안만 로딩 표시), 주소를 고르면 onPick을 부른다.
 * 그냥 닫으면 아무것도 부르지 않는다. 스크립트를 못 불러오면 reject한다(화면이 안내 문구를 보여 준다).
 */
export async function openPostcode(onPick: (result: PostcodeResult) => void): Promise<void> {
  await loadScript()
  const Postcode = window.daum?.Postcode
  if (!Postcode) throw new Error('우편번호 서비스를 불러오지 못했어요')
  new Postcode({
    oncomplete: (data) => onPick({ zipCode: data.zonecode, address: toAddress(data) }),
  }).open()
}
