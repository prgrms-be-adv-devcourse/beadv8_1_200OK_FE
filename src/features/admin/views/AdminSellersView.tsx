import { Button, Pagination, Skeleton, Stack, Table, Tabs, VisuallyHidden } from '@mantine/core'
import { BadgeCheck } from 'lucide-react'
import { Link } from 'react-router'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { PageHeader, QueryState, StatusBadge } from '@/shared/ui'
import { sellerReviewTabLabels } from '../labels'
import type { AdminSellerApplication } from '../types'
import classes from './AdminSellersView.module.css'

// M-01 판매자 심사 목록 /admin/sellers?status=. 시안: admin/AdminSellers (목록)
// 탭 5개(심사 대기 · 심사 중 · 승인 · 반려 · 권한 정지) + 개수. 데스크톱 표, 모바일 카드.
// TODO(api): ❌ 신청 목록 API 없음 (탭별 개수 포함)

export type AdminSellersViewProps = {
  status: 'pending' | 'error' | 'success'
  tab: SellerApplicationStatus
  onTabChange: (tab: SellerApplicationStatus) => void
  counts: Record<SellerApplicationStatus, number>
  /** 지금 탭의 신청 */
  applications: AdminSellerApplication[]
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onRetry?: () => void
}

const detailLink = (app: AdminSellerApplication) => `/admin/sellers/${app.sellerId}`
const detailLabel = (app: AdminSellerApplication) => `${app.storeName} 신청 보기`

function Reviewer({ name }: { name: string | null }) {
  if (name) return <>{name}</>
  return (
    <>
      <span aria-hidden="true">–</span>
      <VisuallyHidden>담당 없음</VisuallyHidden>
    </>
  )
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
          onTabChange((v ?? SellerApplicationStatus.APPLIED) as SellerApplicationStatus)
        }
      >
        <Tabs.List aria-label="심사 상태로 보기" className={classes.tabs}>
          {Object.values(SellerApplicationStatus).map((value) => (
            <Tabs.Tab key={value} value={value}>
              {sellerReviewTabLabels[value]}{' '}
              <span className={`pd-num ${classes.count}`}>{formatAmount(counts[value] ?? 0)}</span>
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
                <Table.Th>상태</Table.Th>
                <Table.Th>담당</Table.Th>
                <Table.Th className={classes.actionCol}>
                  <VisuallyHidden>상세</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {applications.map((app) => (
                <Table.Tr key={app.sellerId}>
                  <Table.Td className="pd-num">{formatDate(app.appliedAt, 'short')}</Table.Td>
                  <Table.Td className={classes.strong}>{app.storeName}</Table.Td>
                  <Table.Td>{app.representativeName}</Table.Td>
                  <Table.Td className="pd-num">{app.businessNumber}</Table.Td>
                  <Table.Td>
                    <StatusBadge status={app.status} />
                  </Table.Td>
                  <Table.Td className={classes.muted}>
                    <Reviewer name={app.reviewerName} />
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
            <li key={app.sellerId} className={classes.card}>
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
                  <dt>담당</dt>
                  <dd>
                    <Reviewer name={app.reviewerName} />
                  </dd>
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
