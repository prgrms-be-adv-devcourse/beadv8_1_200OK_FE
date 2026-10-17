// 공통 UI (0단계 0-3). Mantine으로 안 되는 도메인 컴포넌트만 여기 둔다. 갤러리: /__design
export { CtaBar, type CtaBarProps } from './CtaBar/CtaBar'
export { DisabledReason, type DisabledReasonProps } from './DisabledReason/DisabledReason'
export { EmptyView, type EmptyViewProps, type ViewAction } from './EmptyView/EmptyView'
export { LedgerBlock, type LedgerBlockProps } from './LedgerBlock/LedgerBlock'
export { OptionCard, type OptionCardProps } from './OptionCard/OptionCard'
export { OriginTag, type OriginTagProps } from './OriginTag/OriginTag'
export { type Crumb, PageHeader, type PageHeaderProps } from './PageHeader/PageHeader'
export {
  type PhotoItem,
  PhotoUploader,
  type PhotoUploaderProps,
} from './PhotoUploader/PhotoUploader'
export { PriceText, type PriceTextProps, type PriceTextSize } from './PriceText/PriceText'
export { ProductCard, type ProductCardProps } from './ProductCard/ProductCard'
export { QuantityStepper, type QuantityStepperProps } from './QuantityStepper/QuantityStepper'
export { QueryState, type QueryStateProps, type QueryStatus } from './QueryState/QueryState'
export { RatingStars, type RatingStarsProps } from './RatingStars/RatingStars'
export {
  type BadgeStatus,
  getStatusBadgeSpec,
  StatusBadge,
  type StatusBadgeProps,
} from './StatusBadge/StatusBadge'
export { showToast, type ToastAction } from './toast'
