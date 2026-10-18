import { Alert, Badge, Button, Skeleton, Stack } from '@mantine/core'
import { ClipboardCheck, Info, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { LOW_STOCK_THRESHOLD } from '@/shared/lib/constants'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { EmptyView, PageHeader, PriceText, QueryState } from '@/shared/ui'
import type { SellerHomeStats, SellerProductStats, SellerTodo } from '../types'
import classes from './SellerHomeView.module.css'

// S-03 판매자 센터 홈. 시안: seller/SellerHome, SellerHomeMobile
// 오늘 요약(새 주문 · 출고 대기 · 취소 요청 · 정산 예정) · 오늘 처리할 일 · 판매자 지갑 · 상품 현황 · 상점 프로필 미입력 안내
// 취소 요청이 걸린 주문은 송장 등록 대신 취소 요청 처리로 보낸다(C-10).
// TODO(api): 센터 홈 집계 API 없음(❌). 2단계에서도 fixtures 유지, 각 목록 API가 생기면 거기서 센다

export type SellerHomeViewProps = {
  status: 'pending' | 'error' | 'success'
  /** 집계 기준 시각 */
  asOf: string
  stats: SellerHomeStats
  todos: SellerTodo[]
  walletBalance: number
  products: SellerProductStats
  /** 소개·사진을 아직 안 넣었으면 안내 */
  profileIncomplete?: boolean
  onRetry?: () => void
}

function HomeSkeleton() {
  return (
    <Stack gap="md">
      <Skeleton h={120} radius="md" />
      <Skeleton h={320} radius="md" />
    </Stack>
  )
}

export function SellerHomeView({
  status,
  asOf,
  stats,
  todos,
  walletBalance,
  products,
  profileIncomplete = false,
  onRetry,
}: SellerHomeViewProps) {
  const statItems = [
    {
      label: '새 주문',
      value: stats.newOrders,
      help: '오늘 들어온 주문',
      to: '/seller/orders',
    },
    {
      label: '출고 대기',
      value: stats.waitingShipment,
      help: '송장 등록이 필요해요',
      to: '/seller/orders',
    },
    {
      label: '취소 요청',
      value: stats.cancelRequests,
      help: '처리 전에는 출고할 수 없어요',
      to: '/seller/claims',
      warn: stats.cancelRequests > 0,
    },
  ]

  return (
    <div className={classes.root}>
      <PageHeader
        title="센터 홈"
        hideOnMobile
        actions={
          <span className={`pd-num ${classes.help}`}>{formatDate(asOf, 'dateTime')} 기준</span>
        }
      />

      <QueryState status={status} skeleton={<HomeSkeleton />} onRetry={onRetry}>
        <Stack gap="md">
          {profileIncomplete && (
            <Alert color="info" icon={<Info />} title="상점 프로필을 입력해 주세요">
              <Stack gap="sm" align="flex-start">
                소개와 프로필 사진을 넣으면 구매자에게 상점이 보여요.
                <Button component={Link} to="/seller/profile" variant="outline" size="sm">
                  상점 프로필 입력
                </Button>
              </Stack>
            </Alert>
          )}

          <section className={classes.stats} aria-label="오늘 요약">
            {statItems.map((item) => (
              <Link key={item.label} to={item.to} className={classes.stat}>
                <span className={classes.statLabel}>
                  {item.label}
                  {item.warn && (
                    <Badge color="warning" leftSection={<TriangleAlert aria-hidden="true" />}>
                      확인 필요
                    </Badge>
                  )}
                </span>
                <strong className={`pd-num ${classes.statValue}`}>
                  {formatAmount(item.value)}
                  <span className="pd-won">건</span>
                </strong>
                <span className={classes.help}>{item.help}</span>
              </Link>
            ))}
            <Link to="/seller/payouts" className={classes.stat}>
              <span className={classes.statLabel}>정산 예정 금액</span>
              <PriceText amount={stats.expectedPayout} size="L" />
              <span className={classes.help}>구매확정된 주문 기준</span>
            </Link>
          </section>

          <div className={classes.columns}>
            <section className={classes.card} aria-labelledby="seller-todo">
              <div className={classes.cardHead}>
                <h2 id="seller-todo" className={classes.cardTitle}>
                  오늘 처리할 일
                </h2>
                <Button component={Link} to="/seller/orders" variant="subtle" size="sm">
                  출고 대기 전체 보기
                </Button>
              </div>
              {todos.length === 0 ? (
                <EmptyView
                  icon={<ClipboardCheck />}
                  title="오늘 처리할 일이 없어요"
                  description="새 주문이 들어오면 여기에 보여요."
                  action={{ label: '상품 관리로 가기', to: '/seller/products' }}
                />
              ) : (
                <ul className={classes.todos}>
                  {todos.map((todo) => (
                    <li key={todo.orderItemId} className={classes.todo}>
                      <div className={classes.todoBody}>
                        <div className={classes.todoTitle}>
                          <strong>{todo.itemText}</strong>
                          {todo.cancelRequested && (
                            <Badge
                              color="warning"
                              leftSection={<TriangleAlert aria-hidden="true" />}
                            >
                              취소 요청 있음
                            </Badge>
                          )}
                          {todo.addressChangeRequested && (
                            <Badge
                              color="warning"
                              leftSection={<TriangleAlert aria-hidden="true" />}
                            >
                              배송지 변경 요청
                            </Badge>
                          )}
                        </div>
                        <span className={`pd-num ${classes.help}`}>
                          {todo.orderNumber} · {todo.buyerNickname} ·{' '}
                          {formatDate(todo.orderedAt, 'dateTime')}
                        </span>
                      </div>
                      {todo.cancelRequested ? (
                        <Button component={Link} to="/seller/claims" variant="outline" size="sm">
                          취소 요청 처리
                        </Button>
                      ) : (
                        <Button component={Link} to="/seller/orders" size="sm">
                          송장 등록
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Stack gap="md">
              <section className={classes.card} aria-labelledby="seller-wallet">
                <h2 id="seller-wallet" className={classes.cardLabel}>
                  판매자 지갑 잔액
                </h2>
                <PriceText amount={walletBalance} size="L" />
                <span className={classes.help}>정산된 금액이 매일 새벽 2시에 들어와요</span>
                <div className={classes.cardActions}>
                  <Button component={Link} to="/seller/payouts" variant="outline" size="sm">
                    정산 내역 보기
                  </Button>
                  <Button component={Link} to="/seller/wallet" variant="subtle" size="sm">
                    지갑·출금
                  </Button>
                </div>
              </section>
              <section className={classes.card} aria-labelledby="seller-products">
                <h2 id="seller-products" className={classes.cardLabel}>
                  상품
                </h2>
                <dl className={classes.rows}>
                  <div>
                    <dt>판매 중</dt>
                    <dd className="pd-num">{formatAmount(products.onSale)}개</dd>
                  </div>
                  <div>
                    <dt>판매 준비</dt>
                    <dd className="pd-num">{formatAmount(products.ready)}개</dd>
                  </div>
                  <div data-warn={products.lowStockOptions > 0 || undefined}>
                    <dt>재고 {LOW_STOCK_THRESHOLD}개 이하 옵션</dt>
                    <dd className="pd-num">{formatAmount(products.lowStockOptions)}개</dd>
                  </div>
                </dl>
                <div className={classes.cardActions}>
                  <Button component={Link} to="/seller/products" variant="outline" size="sm">
                    상품 관리
                  </Button>
                </div>
              </section>
            </Stack>
          </div>
        </Stack>
      </QueryState>
    </div>
  )
}
