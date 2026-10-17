import classes from './SkipLink.module.css'

/** 키보드 사용자가 헤더·메뉴를 건너뛰고 본문(#main)으로 가는 링크. 포커스를 받을 때만 보인다 */
export function SkipLink() {
  return (
    <a href="#main" className={classes.skip}>
      본문으로 건너뛰기
    </a>
  )
}
