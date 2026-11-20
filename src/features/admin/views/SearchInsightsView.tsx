import { Anchor, NativeSelect, Skeleton, Stack, Table, Tabs, Text } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import dayjs from 'dayjs'
import { SearchCheck, Tags } from 'lucide-react'
import { Link } from 'react-router'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { PageHeader, QueryState } from '@/shared/ui'
import { SEARCH_INSIGHTS_LIMITS, searchInsightsRangeError } from '../searchInsightsFilter'
import {
  type SearchInsightsParams,
  SearchInsightsTab,
  type UntaggedProduct,
  type ZeroResultKeyword,
} from '../types'
import classes from './SearchInsightsView.module.css'

// M-05 검색 점검 /admin/search-insights?tab= (조회 전용)
// ✅ GET /api/v1/admin/product-search/zero-result-keywords · untagged-products (?from&to&limit, 날짜는 둘 다 포함).
// 출시 뒤 못 찾은 검색어와 태그가 하나도 안 붙은 상품을 보고 태그·동의어 보강 후보를 찾는다.

/** 태그가 붙는 "해당" 확률 기준 (백엔드 판정 기준값) */
const TAG_THRESHOLD = 0.9

const tabLabels: Record<SearchInsightsTab, string> = {
  [SearchInsightsTab.ZERO_RESULT]: '0건 검색어',
  [SearchInsightsTab.UNTAGGED]: '태그 없는 상품',
}

const limitOptions = SEARCH_INSIGHTS_LIMITS.map((limit) => ({
  value: String(limit),
  label: `${limit}개`,
}))

export type SearchInsightsViewProps = {
  tab: SearchInsightsTab
  onTabChange: (tab: SearchInsightsTab) => void
  filter: SearchInsightsParams
  onFilterChange: (filter: SearchInsightsParams) => void
  /** 지금 탭 목록의 상태 */
  status: 'pending' | 'error' | 'success'
  errorMessage?: string
  /** 기간 오류(400)처럼 다시 해도 같은 결과면 넘기지 않는다 */
  onRetry?: () => void
  keywords: ZeroResultKeyword[]
  products: UntaggedProduct[]
}

/** 0.83 → 83%. 기준(90%)에 못 미친 값이 90%로 보이지 않게 0.1%p 아래는 버린다 */
export function formatScore(score: number) {
  return `${Math.floor(score * 1000) / 10}%`
}

function TopTag({ product }: { product: UntaggedProduct }) {
  if (product.topScore === null) {
    return <Text className={classes.muted}>확률 기록이 없어요</Text>
  }
  return (
    <div>
      <Text size="sm" fw={600}>
        {product.topTagLabel ?? '목록에서 빠진 태그'}
      </Text>
      <Text className={`pd-num ${classes.help}`}>
        {formatScore(product.topScore)}
        {product.topTagLabel === null && ' · 판정 뒤 태그 목록에서 빠졌어요'}
      </Text>
    </div>
  )
}

const listSkeleton = (
  <Stack gap="sm" p="md">
    <Skeleton h={44} radius="md" />
    <Skeleton h={44} radius="md" />
    <Skeleton h={44} radius="md" />
  </Stack>
)

export function SearchInsightsView({
  tab,
  onTabChange,
  filter,
  onFilterChange,
  status,
  errorMessage,
  onRetry,
  keywords,
  products,
}: SearchInsightsViewProps) {
  const rangeError = searchInsightsRangeError(filter)
  const today = dayjs().format('YYYY-MM-DD')
  const count = tab === SearchInsightsTab.ZERO_RESULT ? keywords.length : products.length
  const listStatus = status === 'success' && count === 0 ? 'empty' : status

  return (
    <div className={classes.root}>
      <PageHeader title="검색 점검" hideOnMobile />

      <section className={classes.panel} aria-label="검색 점검">
        <Tabs
          value={tab}
          onChange={(next) => next && onTabChange(next as SearchInsightsTab)}
          keepMounted={false}
        >
          <Tabs.List aria-label="점검 목록" className={classes.tabs}>
            {Object.values(SearchInsightsTab).map((value) => (
              <Tabs.Tab key={value} value={value}>
                {tabLabels[value]}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          <div className={classes.filters}>
            <DatePickerInput
              className={classes.date}
              label="시작일"
              value={filter.from}
              onChange={(value) => value && onFilterChange({ ...filter, from: value })}
              valueFormat="YYYY.MM.DD"
              maxDate={today}
              error={rangeError}
            />
            <DatePickerInput
              className={classes.date}
              label="종료일"
              value={filter.to}
              onChange={(value) => value && onFilterChange({ ...filter, to: value })}
              valueFormat="YYYY.MM.DD"
              maxDate={today}
            />
            <NativeSelect
              className={classes.limit}
              label="개수"
              value={String(filter.limit)}
              onChange={(e) => onFilterChange({ ...filter, limit: Number(e.currentTarget.value) })}
              data={limitOptions}
            />
          </div>

          <Tabs.Panel value={SearchInsightsTab.ZERO_RESULT}>
            <Text className={classes.desc}>
              결과가 0건이었던 구매자 검색을 띄어쓰기만 다른 것끼리 묶어 많은 순으로 보여 줘요.
              검색어 기록은 보존 기간(기본 90일)만 남아 있어요.
            </Text>
            {!rangeError && (
              <div className={listStatus === 'success' ? undefined : classes.state}>
                <QueryState
                  status={listStatus}
                  skeleton={listSkeleton}
                  loadingLabel="0건 검색어를 불러오고 있어요"
                  errorMessage={errorMessage}
                  onRetry={onRetry}
                  empty={{
                    icon: <SearchCheck />,
                    title: '이 기간에는 0건 검색어가 없어요',
                    description: '기간을 넓혀 보세요.',
                  }}
                >
                  <div className={classes.tableWrap}>
                    <Table aria-label="0건 검색어 목록">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>검색어</Table.Th>
                          <Table.Th className={classes.right}>0건 횟수</Table.Th>
                          <Table.Th>마지막 검색</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {keywords.map((keyword) => (
                          <Table.Tr key={keyword.normalizedKeyword}>
                            <Table.Td>
                              <Text size="sm" fw={600} className={classes.wrap}>
                                {keyword.sampleKeyword}
                              </Text>
                              {keyword.normalizedKeyword !== keyword.sampleKeyword && (
                                <Text className={`${classes.help} ${classes.wrap}`}>
                                  묶은 검색어 {keyword.normalizedKeyword}
                                </Text>
                              )}
                            </Table.Td>
                            <Table.Td className={`pd-num ${classes.right}`}>
                              {formatAmount(keyword.zeroResultCount)}회
                            </Table.Td>
                            <Table.Td className="pd-num">
                              {formatDate(keyword.lastSearchedAt, 'dateTime')}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </div>
                  <ListSum label="0건 검색어" count={keywords.length} limit={filter.limit} />
                </QueryState>
              </div>
            )}
          </Tabs.Panel>

          <Tabs.Panel value={SearchInsightsTab.UNTAGGED}>
            <Text className={classes.desc}>
              태그 판정을 마쳤는데 태그가 하나도 붙지 않은 상품을 최근 판정 순으로 보여 줘요. 확률이
              기준({TAG_THRESHOLD * 100}%)에 못 미치면 태그가 붙지 않아요.
            </Text>
            {!rangeError && (
              <div className={listStatus === 'success' ? undefined : classes.state}>
                <QueryState
                  status={listStatus}
                  skeleton={listSkeleton}
                  loadingLabel="태그 없는 상품을 불러오고 있어요"
                  errorMessage={errorMessage}
                  onRetry={onRetry}
                  empty={{
                    icon: <Tags />,
                    title: '이 기간에는 태그 없는 상품이 없어요',
                    description: '기간을 넓혀 보세요.',
                  }}
                >
                  <div className={classes.tableWrap}>
                    <Table aria-label="태그 없는 상품 목록">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>상품</Table.Th>
                          <Table.Th>판정 시각</Table.Th>
                          <Table.Th>가장 높았던 태그</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {products.map((product) => (
                          <Table.Tr key={product.productId}>
                            <Table.Td>
                              <Anchor
                                component={Link}
                                to={`/products/${product.productId}`}
                                size="sm"
                                fw={600}
                                className={classes.wrap}
                              >
                                {product.productName}
                              </Anchor>
                              <Text className={`pd-num ${classes.help}`}>
                                상품 {product.productId}
                              </Text>
                            </Table.Td>
                            <Table.Td className="pd-num">
                              {formatDate(product.judgedAt, 'dateTime')}
                            </Table.Td>
                            <Table.Td>
                              <TopTag product={product} />
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </div>
                  <ListSum label="태그 없는 상품" count={products.length} limit={filter.limit} />
                </QueryState>
              </div>
            )}
          </Tabs.Panel>
        </Tabs>
      </section>
    </div>
  )
}

const MAX_LIMIT = SEARCH_INSIGHTS_LIMITS[SEARCH_INSIGHTS_LIMITS.length - 1] ?? 100

/** 개수만큼 꽉 찼으면 더 있을 수 있다고 알린다 */
function ListSum({ label, count, limit }: { label: string; count: number; limit: number }) {
  const more = limit < MAX_LIMIT ? '개수를 늘리면' : '기간을 좁히면'
  return (
    <Text className={`pd-num ${classes.sum}`}>
      {label} {formatAmount(count)}개
      {count >= limit && ` · 최대 ${limit}개까지 보여요. ${more} 더 볼 수 있어요`}
    </Text>
  )
}
