import { Button, Pagination, Skeleton, Stack, Table, Tabs, VisuallyHidden } from '@mantine/core'
import { BadgeCheck } from 'lucide-react'
import { Link } from 'react-router'
import type { SellerApplicationAdminSummary } from '@/shared/api/types'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { PageHeader, QueryState, StatusBadge } from '@/shared/ui'
import { sellerReviewTabLabels } from '../labels'
import classes from './AdminSellersView.module.css'

// M-01 판매자 심사 목록 /admin/sellers?status=&page=. 시안: admin/AdminSellers (목록)
// 탭 4개(심사 대기 · 심사 중 · 승인 · 반려) + 개수. 데스크톱 표, 모바일 카드. 오래된 신청부터(서버 정렬).
// ✅ GET /api/v1/admin/seller-applications?status&page&size. 탭 개수는 상태별 size=1 조회의 totalElements.
// 목록에는 담당 관리자가 없다(상세의 reviewerId만) → 담당 열 대신 신청 회원 번호를 보여 준다.

export type AdminSellersViewProps = {
  status: 'pending' | 'error' | 'success'
  tab: SellerApplicationStatus
  onTabChange: (tab: SellerApplicationStatus) => void
  /** 탭별 개수. 아직 못 받았으면 undefined → ‘–’ */
  counts: Partial<Record<SellerApplicationStatus, number>>
  /** 지금 탭·페이지의 신청 */
  applications: SellerApplicationAdminSummary[]
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onRetry?: () => void
}

const detailLink = (app: SellerApplicationAdminSummary) => `/admin/sellers/${app.applicationId}`
const detailLabel = (app: SellerApplicationAdminSummary) => `${app.storeName} 신청 보기`

function Count({ value }: { value: number | undefined }) {
  if (value === undefined) {
    return (
      <>
        <span aria-hidden="true">–</span>
        <VisuallyHidden>개수 불러오는 중</VisuallyHidden>
      </>
    )
  }
  return <>{formatAmount(value)}</>
}

export function AdminSellersView({
  status,
  tab,
  onTabChange,
  counts,
  applications,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRetry,
}: AdminSellersViewProps) {
  return (
    <div className={classes.root}>
      <PageHeader title="판매자 심사" hideOnMobile />

      <Tabs
        value={tab}
        onChange={(v) =>
          onTabChange((v ?? SellerApplicationStatus.PENDING) as SellerApplicationStatus)
        }
      >
        <Tabs.List aria-label="심사 상태로 보기" className={classes.tabs}>
          {Object.values(SellerApplicationStatus).map((value) => (
            <Tabs.Tab key={value} value={value}>
              {sellerReviewTabLabels[value]}{' '}
              <span className={`pd-num ${classes.count}`}>
                <Count value={counts[value]} />
              </span>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <QueryState
        status={status === 'success' && applications.length === 0 ? 'empty' : status}
        skeleton={
          <Stack gap="xs">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} h={52} radius="md" />
            ))}
          </Stack>
        }
        loadingLabel="신청 목록을 불러오고 있어요"
        onRetry={onRetry}
        empty={{
          icon: <BadgeCheck />,
          title: `${sellerReviewTabLabels[tab]} 판매자가 없어요`,
          description: '상태가 바뀌면 이곳에 보여요.',
        }}
      >
        <div className={classes.tableWrap}>
          <Table aria-label="신청 목록">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>신청일</Table.Th>
                <Table.Th>상호</Table.Th>
                <Table.Th>대표자</Table.Th>
                <Table.Th>사업자등록번호</Table.Th>
                <Table.Th>회원 번호</Table.Th>
                <Table.Th>상태</Table.Th>
                <Table.Th className={classes.actionCol}>
                  <VisuallyHidden>상세</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {applications.map((app) => (
                <Table.Tr key={app.applicationId}>
                  <Table.Td className="pd-num">{formatDate(app.appliedAt, 'short')}</Table.Td>
                  <Table.Td className={classes.strong}>{app.storeName}</Table.Td>
                  <Table.Td>{app.representativeName}</Table.Td>
                  <Table.Td className="pd-num">{app.businessNumber}</Table.Td>
                  <Table.Td className={`pd-num ${classes.muted}`}>{app.memberId}</Table.Td>
                  <Table.Td>
                    <StatusBadge status={app.status} />
                  </Table.Td>
                  <Table.Td className={classes.right}>
                    <Button
                      component={Link}
                      to={detailLink(app)}
                      variant="outline"
                      size="sm"
                      aria-label={detailLabel(app)}
                    >
                      보기
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        <ul className={classes.cards} aria-label="신청 목록">
          {applications.map((app) => (
            <li key={app.applicationId} className={classes.card}>
              <div className={classes.cardHead}>
                <strong>{app.storeName}</strong>
                <StatusBadge status={app.status} />
              </div>
              <dl className={classes.cardMeta}>
                <div>
                  <dt>대표자</dt>
                  <dd>{app.representativeName}</dd>
                </div>
                <div>
                  <dt>사업자등록번호</dt>
                  <dd className="pd-num">{app.businessNumber}</dd>
                </div>
                <div>
                  <dt>신청일</dt>
                  <dd className="pd-num">{formatDate(app.appliedAt, 'short')}</dd>
                </div>
                <div>
                  <dt>회원 번호</dt>
                  <dd className="pd-num">{app.memberId}</dd>
                </div>
              </dl>
              <Button
                component={Link}
                to={detailLink(app)}
                variant="outline"
                fullWidth
                aria-label={detailLabel(app)}
              >
                보기
              </Button>
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <Pagination
            className={classes.pagination}
            total={totalPages}
            value={page}
            onChange={onPageChange}
            getControlProps={(control) => ({
              'aria-label': control === 'previous' ? '이전 페이지' : '다음 페이지',
            })}
          />
        )}
      </QueryState>
    </div>
  )
}
