import { openPostcode } from './daumPostcode'

afterEach(() => {
  for (const script of document.head.querySelectorAll('script')) script.remove()
})

describe('openPostcode', () => {
  it('우편번호 스크립트를 t1.kakaocdn.net에서 불러온다', async () => {
    const opened = openPostcode(() => {})
    const script = document.head.querySelector('script')
    expect(script?.src).toBe('https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js')
    script?.dispatchEvent(new Event('error'))
    await expect(opened).rejects.toThrow('우편번호 서비스를 불러오지 못했어요')
  })
})
