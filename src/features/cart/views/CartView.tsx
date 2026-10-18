import { ActionIcon, Alert, Button, Checkbox, Skeleton, Stack, Text } from '@mantine/core'
import { CircleAlert, Image as ImageIcon, Info, ShoppingCart, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { MAX_CART_QUANTITY } from '@/shared/lib/constants'
import { formatAmount, formatPrice } from '@/shared/lib/format'
import {
  CtaBar,
  DisabledReason,
  FarmAvatar,
  PageHeader,
  PriceText,
  QuantityStepper,
  QueryState,
} from '@/shared/ui'
import type { CartGroup, CartLine } from '../types'
import classes from './CartView.module.css'

// B-03 장바구니. 시안: b2c/Cart, CartMobile
// API는 항목 선택·전체 선택·선택 삭제를 지원하고 주문서는 선택된 상품만 받는다(A-5) → 체크박스를 더했다.
// 배송비는 지금 API가 늘 0원이고 정책도 미정이라(A-8, C-1) 장바구니에서는 계산하지 않고 주문서에서 보여 준다.

export type CartViewProps = {
  status: 'pending' | 'error' | 'success'
  groups: CartGroup[]
  /** 담기·수량 변경 결과 안내 (예: 이미 담긴 상품이라 수량을 더했어요) */
  notice?: string | null
  onQuantityChange: (cartItemId: number, quantity: number) => void
  onToggleSelect: (cartItemId: number, selected: boolean) => void
  onToggleAll: (selected: boolean) => void
  onRemove: (cartItemId: number) => void
  onRemoveSelected: () => void
  onRemoveUnavailable: () => void
  /** 주문하기 (선택된 상품으로 주문서) */
  onOrder: () => void
  onRetry?: () => void
  errorMessage?: string
}

function CartSkeleton() {
  return (
    <div className={classes.layout}>
      <Stack gap="md">
        <Skeleton h={180} radius="md" />
        <Skeleton h={180} radius="md" />
      </Stack>
      <Skeleton h={260} radius="md" />
    </div>
  )
}

function Line({
  line,
  onQuantityChange,
  onToggleSelect,
  onRemove,
}: { line: CartLine } & Pick<CartViewProps, 'onQuantityChange' | 'onToggleSelect' | 'onRemove'>) {
  const unavailable = Boolean(line.unavailableReason)
  const label = `${line.productName} ${line.optionName}`
  const productPath = `/products/${line.productId}`

  return (
    <li className={classes.line} data-unavailable={unavailable || undefined}>
      <Checkbox
        className={classes.check}
        aria-label={`${label} 선택`}
        checked={line.selected}
        onChange={(event) => onToggleSelect(line.cartItemId, event.currentTarget.checked)}
      />
      <Link to={productPath} className={classes.thumb} tabIndex={-1} aria-hidden="true">
        {line.thumbnailUrl ? <img src={line.thumbnailUrl} alt="" /> : <ImageIcon size={24} />}
      </Link>
      <div className={classes.lineBody}>
        <Link to={productPath} className={classes.lineName}>
          {line.productName}
        </Link>
        <span className={`pd-num ${classes.help}`}>
          {line.optionName} · {formatPrice(line.unitPrice)}
        </span>
        {unavailable ? (
          <span className={classes.unavailable}>
            <CircleAlert size={16} aria-hidden="true" />
            {line.unavailableReason}
          </span>
        ) : (
          <QuantityStepper
            value={line.quantity}
            onChange={(quantity) => onQuantityChange(line.cartItemId, quantity)}
            max={MAX_CART_QUANTITY}
            label={`${label} 수량`}
            maxHelp={`한 번에 ${MAX_CART_QUANTITY}개까지 담을 수 있어요`}
          />
        )}
      </div>
      <div className={classes.lineSide}>
        <ActionIcon aria-label={`${label} 삭제`} onClick={() => onRemove(line.cartItemId)}>
          <Trash2 size={20} aria-hidden="true" />
        </ActionIcon>
        <PriceText amount={line.unitPrice * line.quantity} size="S" />
      </div>
    </li>
  )
}

export function CartView({
  status,
  groups,
  notice,
  onQuantityChange,
  onToggleSelect,
  onToggleAll,
  onRemove,
  onRemoveSelected,
  onRemoveUnavailable,
  onOrder,
  onRetry,
  errorMessage,
}: CartViewProps) {
  const lines = groups.flatMap((group) => group.lines)
  const selected = lines.filter((line) => line.selected)
  const selectedUnavailable = selected.some((line) => line.unavailableReason)
  const hasUnavailable = lines.some((line) => line.unavailableReason)
  const allSelected = lines.length > 0 && selected.length === lines.length
  const goodsAmount = selected
    .filter((line) => !line.unavailableReason)
    .reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  const orderReason =
    selected.length === 0
      ? '주문할 상품을 골라 주세요'
      : selectedUnavailable
        ? '구매할 수 없는 상품은 선택을 풀거나 빼 주세요'
        : null

  const orderButton = (fullWidth: boolean) => (
    <Button size="lg" fullWidth={fullWidth} disabled={orderReason !== null} onClick={onOrder}>
      {selected.length > 0 ? `${formatAmount(selected.length)}개 주문하기` : '주문하기'}
    </Button>
  )

  return (
    <div className={classes.root}>
      <PageHeader title="장바구니" backTo="/" />

      <QueryState
        status={status === 'success' && lines.length === 0 ? 'empty' : status}
        skeleton={<CartSkeleton />}
        loadingLabel="장바구니를 불러오고 있어요"
        errorMessage={errorMessage}
        onRetry={onRetry}
        empty={{
          icon: <ShoppingCart />,
          title: '장바구니가 비어 있어요',
          description: '산지에서 막 수확한 상품을 둘러보세요.',
          action: { label: '상품 둘러보기', to: '/products' },
        }}
      >
        <div className={classes.layout}>
          <Stack gap="md">
            {notice && (
              <Alert color="info" icon={<Info />} role="status">
                {notice}
              </Alert>
            )}
            {hasUnavailable && (
              <Alert
                color="warning"
                icon={<CircleAlert />}
                title="지금 구매할 수 없는 상품이 있어요"
              >
                <Stack gap="sm" align="flex-start">
                  빼고 나서 주문해 주세요.
                  <Button variant="outline" size="sm" onClick={onRemoveUnavailable}>
                    구매할 수 없는 상품 빼기
                  </Button>
                </Stack>
              </Alert>
            )}

            <div className={classes.selectBar}>
              <Checkbox
                label={`전체 선택 (${selected.length}/${lines.length})`}
                checked={allSelected}
                indeterminate={selected.length > 0 && !allSelected}
                onChange={(event) => onToggleAll(event.currentTarget.checked)}
              />
              {selected.length > 0 && (
                <Button variant="subtle" size="sm" onClick={onRemoveSelected}>
                  선택 삭제
                </Button>
              )}
            </div>

            {groups.map((group) => (
              <section
                key={group.sellerId}
                className={classes.group}
                aria-labelledby={`cart-farm-${group.sellerId}`}
              >
                <div className={classes.groupHead}>
                  <FarmAvatar name={group.sellerName} size={32} />
                  <h2 id={`cart-farm-${group.sellerId}`} className={classes.groupName}>
                    <Link to={`/farms/${group.sellerId}`}>{group.sellerName}</Link>
                  </h2>
                </div>
                <ul className={classes.lines}>
                  {group.lines.map((line) => (
                    <Line
                      key={line.cartItemId}
                      line={line}
                      onQuantityChange={onQuantityChange}
                      onToggleSelect={onToggleSelect}
                      onRemove={onRemove}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </Stack>

          <aside aria-labelledby="cart-summary" className={classes.summary}>
            <h2 id="cart-summary" className={classes.summaryTitle}>
              결제 예정 금액
            </h2>
            <dl className={classes.rows}>
              <div>
                <dt>선택 상품 금액</dt>
                <dd>
                  <PriceText amount={goodsAmount} size="S" />
                </dd>
              </div>
              <div>
                <dt>배송비</dt>
                <dd className={classes.help}>주문서에서 확인해요</dd>
              </div>
            </dl>
            <div className={classes.desktopOnly}>
              <DisabledReason reason={orderReason} fullWidth>
                {orderButton(true)}
              </DisabledReason>
            </div>
            <Text className={classes.help}>선택한 상품만 주문해요. 결제는 예치금으로 해요.</Text>
          </aside>
        </div>

        <CtaBar
          summary={
            <>
              선택 상품 <PriceText amount={goodsAmount} size="M" />
            </>
          }
          reason={orderReason}
          action={orderButton(false)}
        />
      </QueryState>
    </div>
  )
}
