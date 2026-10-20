import classes from './RichContent.module.css'

// 서버가 정제해 저장한 HTML(상품 상세설명 descriptionHtml)을 그린다. 정제는 서버 몫이라 여기서는 다시 거르지 않는다.
// 판매자 에디터(@mantine/tiptap)도 같은 클래스(richContentClassName)를 써서 쓰는 화면과 보는 화면 모양을 맞춘다.

export const richContentClassName = classes.root

export type RichContentProps = {
  html: string
  className?: string
}

export function RichContent({ html, className }: RichContentProps) {
  return (
    <div
      className={className ? `${classes.root} ${className}` : classes.root}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 서버가 저장할 때 정제한 HTML(descriptionHtml)이다
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
