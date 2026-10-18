import {
  Alert,
  Button,
  Checkbox,
  Loader,
  Modal,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core'
import { CircleAlert, CircleX, Info, MapPin, RefreshCw, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { Checkout, CreateOrderRequest, ShippingAddress } from '@/shared/api/types'
import { MIN_CHARGE_AMOUNT } from '@/shared/lib/constants'
import { formatAmount, formatPrice } from '@/shared/lib/format'
import {
  AddressModal,
  CtaBar,
  DisabledReason,
  FarmAvatar,
  PageHeader,
  PriceText,
  QueryState,
} from '@/shared/ui'
import type { PaymentState } from '../types'
import classes from './CheckoutView.module.css'

// B-04 주문서. 시안: b2c/Checkout, CheckoutMobile
// 결제는 예치금으로만 한다(B-1 확정). 잔액이 부족하면 결제를 막고 부족한 만큼 충전하러 보냈다가 주문서로 돌아온다.
// API 기준으로 더한 것: 판매자 정보 제공 동의(필수), 409 ‘주문 금액이 바뀌었어요’ 안내(A-6).
// 배송비는 API 값 그대로(지금은 0원, A-8). 상품 사진·농가 이름은 주문서 API에 없어 따로 받는다(TODO(api)).

export type CheckoutViewProps = {
  status: 'pending' | 'error' | 'success'
  checkout?: Checkout
  /** TODO(api): 주문서 API는 sellerId만 준다 */
  sellerNames?: Record<number, string>
  /** TODO(api): 📝 GET /wallets/me 잔액 */
  balance: number
  /** 처음 배송지: 충전에 다녀오기 전 적어 둔 초안. TODO(api): 📝 회원 배송지 GET /members/me/address. 없으면 null */
  defaultAddress?: ShippingAddress | null
  /** 배송지 모달에서 ‘이번 주문에 적용’을 눌렀을 때 (초안 저장) */
  onAddressSave?: (address: ShippingAddress) => void
  paymentState?: PaymentState
  /** 409로 주문서를 다시 불러왔을 때 이전 금액 */
  previousTotal?: number | null
  /** 결제 실패 문구 (서버 detail) */
  errorMessage?: string | null
  loadErrorMessage?: string
  onPay: (request: CreateOrderRequest) => void
  onRetry?: () => void
}

function CheckoutSkeleton() {
  return (
    <div className={classes.layout}>
      <Stack gap="md">
        <Skeleton h={140} radius="md" />
        <Skeleton h={220} radius="md" />
        <Skeleton h={160} radius="md" />
      </Stack>
      <Skeleton h={300} radius="md" />
    </div>
  )
}

function AddressText({ address }: { address: ShippingAddress }) {
  return (
    <div className={classes.address}>
      <p className="pd-num">
        <strong>{address.recipientName}</strong> · {address.recipientPhone}
      </p>
      <p className="pd-num">
        ({address.zipCode}) {address.address}
        {address.addressDetail ? `, ${address.addressDetail}` : ''}
      </p>
    </div>
  )
}

export function CheckoutView({
  status,
  checkout,
  sellerNames = {},
  balance,
  defaultAddress = null,
  paymentState = 'idle',
  previousTotal,
  errorMessage,
  loadErrorMessage,
  onAddressSave,
  onPay,
  onRetry,
}: CheckoutViewProps) {
  const [address, setAddress] = useState<ShippingAddress | null>(defaultAddress)
  const [addressOpen, setAddressOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const resolvedStatus =
    status === 'success' && (!checkout || checkout.sellerGroups.length === 0) ? 'empty' : status

  if (resolvedStatus !== 'success' || !checkout) {
    return (
      <div className={classes.root}>
        <PageHeader title="주문서" backTo="/cart" />
        <QueryState
          status={resolvedStatus}
          skeleton={<CheckoutSkeleton />}
          loadingLabel="주문서를 불러오고 있어요"
          errorMessage={loadErrorMessage}
          onRetry={onRetry}
          empty={{
            icon: <CircleAlert />,
            title: '주문할 상품이 없어요',
            description: '장바구니에서 주문할 상품을 골라 주세요.',
            action: { label: '장바구니로', to: '/cart' },
          }}
        />
      </div>
    )
  }

  const total = checkout.totalAmount
  const shortfall = Math.max(0, total - balance)
  const itemCount = checkout.sellerGroups.reduce((sum, group) => sum + group.items.length, 0)
  const chargePath = `/wallet/charge?shortfall=${shortfall}&returnTo=${encodeURIComponent('/checkout')}`
  const payReason = !address
    ? '배송지를 입력해 주세요'
    : shortfall > 0
      ? '예치금이 부족해 결제할 수 없어요'
      : !agreed
        ? '판매자 정보 제공에 동의해 주세요'
        : null

  const pay = () => {
    if (!address || payReason) return
    onPay({ ...address, thirdPartyProvisionAgreed: true, expectedTotalAmount: total })
  }

  const payButton = (fullWidth: boolean) => (
    <Button
      size="lg"
      fullWidth={fullWidth}
      className="pd-num"
      disabled={payReason !== null}
      loading={paymentState === 'processing'}
      onClick={pay}
    >
      {formatPrice(total)} 결제하기
    </Button>
  )

  return (
    <div className={classes.root}>
      <PageHeader title="주문서" backTo="/cart" />

      <div className={classes.layout}>
        <Stack gap="md">
          {paymentState === 'failed' && (
            <Alert color="error" icon={<CircleX />} title="결제하지 못했어요" role="alert">
              <Stack gap="sm" align="flex-start">
                {errorMessage ?? '예치금은 그대로예요. 잠시 후 다시 시도해 주세요.'}
                <Button variant="outline" size="sm" onClick={pay} disabled={payReason !== null}>
                  다시 결제하기
                </Button>
              </Stack>
            </Alert>
          )}
          {previousTotal != null && previousTotal !== total && (
            <Alert color="warning" icon={<RefreshCw />} title="주문 금액이 바뀌었어요" role="alert">
              <span className="pd-num">
                {formatPrice(previousTotal)} → {formatPrice(total)}. 바뀐 금액을 확인하고 다시
                결제해 주세요.
              </span>
            </Alert>
          )}

          {/* 배송지 */}
          <section className={classes.card} aria-labelledby="checkout-address">
            <div className={classes.cardHead}>
              <h2 id="checkout-address" className={classes.cardTitle}>
                배송지
              </h2>
              {address && (
                <Button variant="subtle" size="sm" onClick={() => setAddressOpen(true)}>
                  변경
                </Button>
              )}
            </div>
            {address ? (
              <>
                <AddressText address={address} />
                <Text className={classes.help}>
                  주문서에서 바꾼 배송지는 이번 주문에만 적용돼요
                </Text>
              </>
            ) : (
              <div className={classes.noAddress}>
                <MapPin size={20} aria-hidden="true" />
                <div>
                  <strong>배송지를 입력해 주세요</strong>
                  <Text className={classes.help}>배송지가 있어야 결제할 수 있어요</Text>
                </div>
                <Button variant="outline" onClick={() => setAddressOpen(true)}>
                  배송지 입력
                </Button>
              </div>
            )}
          </section>

          {/* 주문 상품 */}
          <section className={classes.card} aria-labelledby="checkout-items">
            <div className={classes.cardHead}>
              <h2 id="checkout-items" className={classes.cardTitle}>
                주문 상품
              </h2>
              <span className={`pd-num ${classes.help}`}>
                농가 {checkout.sellerGroups.length}곳 · 상품 {itemCount}개
              </span>
            </div>
            {checkout.sellerGroups.map((group) => {
              const name = sellerNames[group.sellerId] ?? '판매자'
              return (
                <div key={group.sellerId} className={classes.group}>
                  <div className={classes.groupHead}>
                    <FarmAvatar name={name} size={32} />
                    <h3 className={classes.groupName}>{name}</h3>
                  </div>
                  <ul className={classes.items}>
                    {group.items.map((item) => (
                      <li key={item.productOptionId}>
                        <div>
                          <p className={classes.itemName}>{item.productName}</p>
                          <p className={`pd-num ${classes.help}`}>
                            {item.productOptionName} · {formatAmount(item.quantity)}개
                          </p>
                        </div>
                        <PriceText amount={item.itemAmount} size="S" />
                      </li>
                    ))}
                  </ul>
                  <div className={classes.row}>
                    <span>배송비</span>
                    <PriceText amount={group.shippingFee} size="S" />
                  </div>
                </div>
              )
            })}
          </section>

          {/* 결제 수단 */}
          <section className={classes.card} aria-labelledby="checkout-pay">
            <h2 id="checkout-pay" className={classes.cardTitle}>
              결제 수단
            </h2>
            <div className={classes.method}>
              <ThemeIcon color="primary" variant="light" size={40} radius="md" aria-hidden="true">
                <Wallet size={20} />
              </ThemeIcon>
              <div>
                <p className={classes.itemName}>예치금 결제</p>
                <Text className={classes.help}>보유 예치금에서 바로 차감돼요</Text>
              </div>
            </div>
            <dl className={classes.rows}>
              <div>
                <dt>보유 예치금</dt>
                <dd>
                  <PriceText amount={balance} size="S" />
                </dd>
              </div>
              {shortfall > 0 ? (
                <div data-tone="warning">
                  <dt>부족 금액</dt>
                  <dd>
                    <PriceText amount={shortfall} size="S" />
                  </dd>
                </div>
              ) : (
                <div>
                  <dt>결제 후 잔액</dt>
                  <dd>
                    <PriceText amount={balance - total} size="S" />
                  </dd>
                </div>
              )}
            </dl>
            {shortfall > 0 && (
              <Alert
                color="warning"
                icon={<CircleAlert />}
                title={`예치금이 ${formatPrice(shortfall)} 부족해요`}
              >
                <Stack gap="sm" align="flex-start">
                  <span className="pd-num">
                    부족한 만큼 충전하고 이 주문서로 돌아와 결제해요. 최소 충전 금액은{' '}
                    {formatPrice(MIN_CHARGE_AMOUNT)}이에요.
                  </span>
                  <Button component={Link} to={chargePath} variant="outline">
                    예치금 충전하기
                  </Button>
                </Stack>
              </Alert>
            )}
          </section>

          {/* 판매자 정보 제공 동의 (API 필수) */}
          <section className={classes.card} aria-labelledby="checkout-agree">
            <h2 id="checkout-agree" className={classes.cardTitle}>
              주문 정보 제공 동의
            </h2>
            <Checkbox
              label="[필수] 주문 정보를 판매자에게 제공하는 데 동의해요"
              description="받는 분 이름·연락처·주소를 상품을 보내는 농가에 배송 목적으로 제공해요."
              checked={agreed}
              onChange={(event) => setAgreed(event.currentTarget.checked)}
            />
          </section>

          <Alert color="info" icon={<Info />}>
            출고 전까지만 취소를 요청할 수 있어요. 신선식품은 단순 변심 반품이 어려워요.
          </Alert>
        </Stack>

        <aside aria-labelledby="checkout-summary" className={classes.summary}>
          <h2 id="checkout-summary" className={classes.cardTitle}>
            결제 금액
          </h2>
          <dl className={classes.rows}>
            <div>
              <dt>상품 금액</dt>
              <dd>
                <PriceText amount={checkout.totalProductAmount} size="S" />
              </dd>
            </div>
            <div>
              <dt>배송비</dt>
              <dd>
                <PriceText amount={checkout.totalShippingFee} size="S" />
              </dd>
            </div>
            <div className={classes.totalRow}>
              <dt>총 결제 금액</dt>
              <dd>
                <PriceText amount={total} size="M" />
              </dd>
            </div>
          </dl>
          <div className={classes.desktopOnly}>
            <DisabledReason reason={payReason} fullWidth>
              {payButton(true)}
            </DisabledReason>
          </div>
          {payReason === null && (
            <Text className={classes.help}>결제하면 예치금에서 바로 차감돼요</Text>
          )}
        </aside>
      </div>

      <CtaBar
        summary={
          <>
            총 <PriceText amount={total} size="M" />
          </>
        }
        reason={payReason}
        action={payButton(false)}
      />

      <AddressModal
        opened={addressOpen}
        initial={address}
        onClose={() => setAddressOpen(false)}
        onSave={(next) => {
          setAddress(next)
          setAddressOpen(false)
          onAddressSave?.(next)
        }}
      />

      {/* 결제 처리 중: 닫을 수 없는 모달 (COMPONENTS.md) */}
      <Modal
        opened={paymentState === 'processing'}
        onClose={() => {}}
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        title="결제를 확인하고 있어요"
      >
        <div className={classes.processing} role="status">
          <Loader size="sm" aria-hidden="true" />
          잠시만 기다려 주세요. 화면을 닫지 마세요.
        </div>
      </Modal>
    </div>
  )
}
