import { Badge } from '@mantine/core'
import type { ProductRegion } from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'
import { regionLabels } from '@/shared/lib/labels'

// 산지 꼬리표: 볏짚 바탕 + 흙갈색 글자, 높이 24, radius 6. 예: 수확 10.08 · 경북 청송 · 출하 10.12
// 수확일·출하일·상세 지역은 아직 API에 없다(DECISIONS.md A-2). 지금은 시·도만 내려온다.

type DateTag = { kind: 'harvest' | 'shipping'; date: string | Date }

type RegionTag = {
  kind: 'region'
  region: ProductRegion
  /** 시·군 등 상세 지역 */
  detail?: string
}

export type OriginTagProps = DateTag | RegionTag

function tagText(props: OriginTagProps): string {
  switch (props.kind) {
    case 'harvest':
      return `수확 ${formatDate(props.date, 'short')}`
    case 'shipping':
      return `출하 ${formatDate(props.date, 'short')}`
    case 'region':
      return [regionLabels[props.region], props.detail].filter(Boolean).join(' ')
  }
}

export function OriginTag(props: OriginTagProps) {
  return (
    <Badge color="straw" className="pd-num">
      {tagText(props)}
    </Badge>
  )
}
