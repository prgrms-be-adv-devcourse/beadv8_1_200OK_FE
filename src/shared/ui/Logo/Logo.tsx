import seal from '@/shared/assets/brand/logo-seal.svg'
import sealReverse from '@/shared/assets/brand/logo-seal-reverse.svg'
import sealSmall from '@/shared/assets/brand/logo-seal-small.svg'
import sealSmallReverse from '@/shared/assets/brand/logo-seal-small-reverse.svg'
import classes from './Logo.module.css'

// 로고 = 인장 그림 + 명조 워드마크(텍스트). 기준: design/BRAND.md ‘프론트 적용 위치’
// 인장은 32px 이상이면 네 글자, 미만이면 ‘곳’ 한 글자. 어두운 배경(tone="dark")은 반전 인장 + 밝은 글자.
// 워드마크가 링크 이름이 되므로 인장은 장식(alt="")이다.

export type LogoPreset = 'header' | 'headerMobile' | 'console' | 'drawer' | 'auth'

export type LogoProps = {
  preset: LogoPreset
  tone?: 'light' | 'dark'
}

/** 인장 크기(px). auth는 64em 미만에서 CSS가 36으로 줄인다 */
const sealSize: Record<LogoPreset, number> = {
  header: 32,
  headerMobile: 28,
  console: 28,
  drawer: 26,
  auth: 40,
}

export function Logo({ preset, tone = 'light' }: LogoProps) {
  const size = sealSize[preset]
  const small = size < 32
  const dark = tone === 'dark'
  const src = small ? (dark ? sealSmallReverse : sealSmall) : dark ? sealReverse : seal

  return (
    <span className={classes.root} data-preset={preset} data-tone={tone}>
      <img className={classes.seal} src={src} width={size} height={size} alt="" />
      <span className={`pd-serif ${classes.wordmark}`}>팔도곳간</span>
    </span>
  )
}
