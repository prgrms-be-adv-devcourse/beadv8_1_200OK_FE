import { Badge, Button, Skeleton, Stack } from '@mantine/core'
import { BadgeCheck, ChevronRight, Clock } from 'lucide-react'
import { Link } from 'react-router'
import { formatAmount, formatPrice } from '@/shared/lib/format'
import {
  FarmAvatar,
  NotConnected,
  NotConnectedValue,
  PageHeader,
  PriceText,
  QueryState,
} from '@/shared/ui'
import type { MyProfile, MySellerStatus, OrderCounts } from '../types'
import classes from './MyPageView.module.css'

// B-12 마이페이지 홈. 시안: b2c/MyPage, MyPageMobile
// 프로필 · 예치금(충전·이용 내역) · 주문 현황 · 관심/팔로우/배송지 바로가기 · 판매자 안내(역할 3종).
// 메뉴(데스크톱 왼쪽 · 모바일 아래 목록)는 MyPageLayout이 그린다.
// 예치금·보유 한도는 ✅ GET /wallets/me/balance, 판매자 카드는 토큰 역할 + 신청 현황.
// TODO(api): ❌ GET /members/me(프로필)·관심·팔로우·배송지 API 없음, 주문 현황 수는 주문 목록에 상태별 집계가 없다.
//   모르는 값은 넘기지 않는다(undefined) → 프로필은 ‘연결 전’ 안내, 숫자·배송지는 ‘–’(NotConnectedValue). 0이나 ‘등록 전’으로 그리지 않는다.

export type MyPageViewProps = {
  status: 'pending' | 'error' | 'success'
  /** 없으면 프로필 자리에 ‘연결 전’ 안내 (TODO(api): ❌ GET /members/me) */
  profile?: MyProfile
  seller: MySellerStatus
  balance?: number
  /** 잔액 보유 한도 (GET /wallets/me/balance의 maxBalance) */
  maxBalance?: number
  /** 없으면 ‘–’(연결 전) */
  orderCounts?: OrderCounts
  /** 없으면 ‘–’(연결 전) */
  likedCount?: number
  /** 없으면 ‘–’(연결 전) */
  followingCount?: number
  /** 저장된 배송지 요약 (예: 서울 중구). null이면 등록 전, undefined면 ‘–’(연결 전) */
  addressSummary?: string | null
  onRetry?: () => void
}

const sellerCard: Record<MySellerStatus['status'], { cta: string; to: string }> = {
  none: { cta: '판매자 신청하기', to: '/seller/apply' },
  applying: { cta: '신청 현황 보기', to: '/seller/apply/status' },
  approved: { cta: '판매자 센터로 가기', to: '/seller' },
}

function sellerText(seller: MySellerStatus): [string, string] {
  switch (seller.status) {
    case 'approved':
      return [
        seller.storeName ? `${seller.storeName}을 운영하고 있어요` : '판매자로 승인됐어요',
        '주문 출고와 정산은 판매자 센터에서 관리해요.',
      ]
    case 'applying':
      return ['판매자 신청을 심사하고 있어요', '관리자가 확인하면 신청 현황에서 바로 알려 드려요.']
    case 'none':
      return [
        '직접 키운 농산물을 팔아 보세요',
        '판매자로 승인되면 상품을 올리고, 구매확정된 금액을 정산받을 수 있어요.',
      ]
  }
}

function MySkeleton() {
  return (
    <Stack gap="md">
      <Skeleton h={88} radius="md" />
      <Skeleton h={180} radius="md" />
      <Skeleton h={120} radius="md" />
    </Stack>
  )
}

export function MyPageView({
  status,
  profile,
  seller,
  balance = 0,
  maxBalance = 500_000,
  orderCounts,
  likedCount,
  followingCount,
  addressSummary,
  onRetry,
}: MyPageViewProps) {
  const [sellerTitle, sellerDesc] = sellerText(seller)
  const room = Math.max(0, maxBalance - balance)
  const counts = [
    { label: '상품 준비 중', value: orderCounts?.preparing },
    { label: '배송 중', value: orderCounts?.shipping },
    { label: '배송 완료', value: orderCounts?.delivered },
  ]
  const sellerBadge =
    seller.status === 'approved' ? (
      <Badge color="primary" leftSection={<BadgeCheck aria-hidden="true" />}>
        {seller.storeName ? `판매자 · ${seller.storeName}` : '판매자'}
      </Badge>
    ) : seller.status === 'applying' ? (
      <Badge color="warning" leftSection={<Clock aria-hidden="true" />}>
        판매자 심사 중
      </Badge>
    ) : null

  return (
    <div className={classes.root}>
      <PageHeader title="마이페이지" />
      <QueryState
        status={status}
        skeleton={<MySkeleton />}
        loadingLabel="내 정보를 불러오고 있어요"
        onRetry={onRetry}
      >
        <section className={`${classes.card} ${classes.profile}`} aria-label="내 프로필">
          {profile ? (
            <>
              <FarmAvatar name={profile.nickname} size={56} />
              <div className={classes.profileBody}>
                <div className={classes.nameRow}>
                  <strong className={classes.nickname}>{profile.nickname}</strong>
                  {sellerBadge}
                </div>
                <span className={`pd-num ${classes.help}`}>
                  {profile.loginId} · {profile.name}
                </span>
              </div>
            </>
          ) : (
            <div className={classes.profileBody}>
              {sellerBadge && <div className={classes.nameRow}>{sellerBadge}</div>}
              <NotConnected
                layout="inline"
                title="내 정보는 아직 연결되지 않았어요"
                api="❌ GET /members/me"
              />
            </div>
          )}
          <Button component={Link} to="/me/account?tab=info" variant="subtle" size="sm">
            내 정보 수정
          </Button>
        </section>

        <div className={classes.twoCol}>
          <section className={classes.card} aria-labelledby="my-wallet">
            <h2 id="my-wallet" className={classes.cardLabel}>
              예치금
            </h2>
            <PriceText amount={balance} size="L" />
            <span className={`pd-num ${classes.help}`}>
              지금 최대 {formatPrice(room)}까지 충전할 수 있어요
            </span>
            <div className={classes.buttons}>
              <Button component={Link} to="/wallet/charge">
                충전하기
              </Button>
              <Button component={Link} to="/me/wallet" variant="outline">
                이용 내역
              </Button>
            </div>
          </section>

          <section className={classes.card} aria-labelledby="my-orders">
            <div className={classes.cardHead}>
              <h2 id="my-orders" className={classes.cardTitle}>
                주문 현황
              </h2>
              <Button component={Link} to="/orders" variant="subtle" size="sm">
                전체 보기
              </Button>
            </div>
            <ul className={classes.strip}>
              {counts.map((count) => (
                <li key={count.label}>
                  <Link to="/orders" className={classes.stripItem}>
                    <strong className="pd-num">
                      {count.value === undefined ? (
                        <NotConnectedValue />
                      ) : (
                        formatAmount(count.value)
                      )}
                    </strong>
                    <span>{count.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className={classes.help}>배송 완료 후 3일이 지나면 자동으로 구매확정돼요</p>
          </section>
        </div>

        <div className={classes.shortcuts}>
          <Link to="/me/likes?tab=products" className={classes.shortcut}>
            <span>관심 상품</span>
            <span className={classes.shortcutValue}>
              <strong className="pd-num">
                {likedCount === undefined ? <NotConnectedValue /> : formatAmount(likedCount)}
              </strong>
              <ChevronRight size={18} aria-hidden="true" />
            </span>
          </Link>
          <Link to="/me/likes?tab=farms" className={classes.shortcut}>
            <span>팔로우한 농가</span>
            <span className={classes.shortcutValue}>
              <strong className="pd-num">
                {followingCount === undefined ? (
                  <NotConnectedValue />
                ) : (
                  formatAmount(followingCount)
                )}
              </strong>
              <ChevronRight size={18} aria-hidden="true" />
            </span>
          </Link>
          <Link to="/me/account?tab=address" className={classes.shortcut}>
            <span>배송지</span>
            <span className={classes.shortcutValue}>
              <span className={classes.help}>
                {addressSummary === undefined ? (
                  <NotConnectedValue />
                ) : (
                  (addressSummary ?? '등록 전이에요')
                )}
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </span>
          </Link>
        </div>

        <section className={`${classes.card} ${classes.seller}`} aria-labelledby="my-seller">
          <div>
            <h2 id="my-seller" className={classes.cardTitle}>
              {sellerTitle}
            </h2>
            <p className={classes.sellerDesc}>{sellerDesc}</p>
          </div>
          <Button component={Link} to={sellerCard[seller.status].to} variant="outline">
            {sellerCard[seller.status].cta}
          </Button>
        </section>
      </QueryState>
    </div>
  )
}
