import classes from './FarmAvatar.module.css'

// 농가(판매자 상점) 사진. 사진이 없으면 볏짚 원 + 상호 첫 글자. 크기 32 상세 상단 · 56 농가 카드 · 96 상점 머리
// 이름은 옆에 글로 함께 쓰므로 그림은 aria-hidden이다.
// 시안: b2c/Home(단골이 많은 농가), b2c/Main, b2c/Store

export type FarmAvatarProps = {
  name: string
  imageUrl?: string | null
  size?: 32 | 56 | 96
}

export function FarmAvatar({ name, imageUrl, size = 56 }: FarmAvatarProps) {
  return (
    <span className={classes.root} data-size={size} aria-hidden="true">
      {imageUrl ? <img className={classes.image} src={imageUrl} alt="" /> : name.trim().charAt(0)}
    </span>
  )
}
