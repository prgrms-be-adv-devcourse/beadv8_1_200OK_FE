import { Badge, Button, Skeleton, Stack } from '@mantine/core'
import { BadgeCheck, ChevronRight, Clock } from 'lucide-react'
import { Link } from 'react-router'
import { WALLET_BALANCE_LIMIT } from '@/shared/lib/constants'
import { formatAmount, formatPrice } from '@/shared/lib/format'
import { FarmAvatar, PageHeader, PriceText, QueryState } from '@/shared/ui'
import type { MyProfile, MySellerStatus, OrderCounts } from '../types'
import classes from './MyPageView.module.css'

// B-12 마이페이지 홈. 시안: b2c/MyPage, MyPageMobile
// 프로필 · 예치금(충전·이용 내역) · 주문 현황 · 관심/팔로우/배송지 바로가기 · 판매자 안내(역할 3종).
// 메뉴(데스크톱 왼쪽 · 모바일 아래 목록)는 MyPageLayout이 그린다.
// TODO(api): 📝 GET /members/me, GET /wallets/me, 주문 현황·관심 수는 각 목록 API로 센다

export type MyPageViewProps = {
  status: 'pending' | 'error' | 'success'
  profile?: MyProfile
  seller: MySellerStatus
  balance?: number
  orderCounts?: OrderCounts
  likedCount?: number
  followingCount?: number
  /** 저장된 배송지 요약 (예: 서울 중구). 없으면 null */
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
        `${seller.storeName}을 운영하고 있어요`,
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
  orderCounts = { preparing: 0, shipping: 0, delivered: 0 },
  likedCount = 0,
  followingCount = 0,
  addressSummary = null,
  onRetry,
}: MyPageViewProps) {
  const [sellerTitle, sellerDesc] = sellerText(seller)
  const room = Math.max(0, WALLET_BALANCE_LIMIT - balance)
  const counts = [
    { label: '상품 준비 중', value: orderCounts.preparing },
    { label: '배송 중', value: orderCounts.shipping },
    { label: '배송 완료', value: orderCounts.delivered },
  ]

  return (
    <div className={classes.root}>
      <PageHeader title="마이페이지" />
      <QueryState
        status={status === 'success' && !profile ? 'error' : status}
        skeleton={<MySkeleton />}
        loadingLabel="내 정보를 불러오고 있어요"
        onRetry={onRetry}
      >
        {profile && (
          <>
            <section className={`${classes.card} ${classes.profile}`} aria-label="내 프로필">
              <FarmAvatar name={profile.nickname} size={56} />
              <div className={classes.profileBody}>
                <div className={classes.nameRow}>
                  <strong className={classes.nickname}>{profile.nickname}</strong>
                  {seller.status === 'approved' && (
                    <Badge color="primary" leftSection={<BadgeCheck aria-hidden="true" />}>
                      판매자 · {seller.storeName}
                    </Badge>
                  )}
                  {seller.status === 'applying' && (
                    <Badge color="warning" leftSection={<Clock aria-hidden="true" />}>
                      판매자 심사 중
                    </Badge>
                  )}
                </div>
                <span className={`pd-num ${classes.help}`}>
                  {profile.loginId} · {profile.name}
                </span>
              </div>
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
                      <Link to="/orders?filter=IN_PROGRESS" className={classes.stripItem}>
                        <strong className="pd-num">{formatAmount(count.value)}</strong>
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
                  <strong className="pd-num">{formatAmount(likedCount)}</strong>
                  <ChevronRight size={18} aria-hidden="true" />
                </span>
              </Link>
              <Link to="/me/likes?tab=farms" className={classes.shortcut}>
                <span>팔로우한 농가</span>
                <span className={classes.shortcutValue}>
                  <strong className="pd-num">{formatAmount(followingCount)}</strong>
                  <ChevronRight size={18} aria-hidden="true" />
                </span>
              </Link>
              <Link to="/me/account?tab=address" className={classes.shortcut}>
                <span>배송지</span>
                <span className={classes.shortcutValue}>
                  <span className={classes.help}>{addressSummary ?? '등록 전이에요'}</span>
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
          </>
        )}
      </QueryState>
    </div>
  )
}
