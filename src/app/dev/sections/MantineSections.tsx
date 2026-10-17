import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  type ButtonProps,
  Checkbox,
  Chip,
  Drawer,
  Group,
  Loader,
  Modal,
  NativeSelect,
  NavLink,
  NumberInput,
  Pagination,
  Paper,
  PasswordInput,
  Radio,
  Rating,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Stepper,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  VisuallyHidden,
} from '@mantine/core'
import {
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Clock,
  EllipsisVertical,
  Heart,
  House,
  Info,
  LoaderCircle,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import type { StatusTone } from '@/shared/styles/variantColorResolver'
import { showToast } from '@/shared/ui/toast'
import classes from '../DesignGallery.module.css'
import { GallerySection, Measure, Panel, StateGrid, StateItem } from '../GalleryParts'
import preview from '../preview.module.css'

// 0-2 Mantine 테마로 맞춘 부품. 시안: design/screens/common/Components.dc.html

// ─── 버튼 ─────────────────────────────────────────────────

type ButtonState = 'default' | 'hover' | 'pressed' | 'focus' | 'disabled' | 'loading'

const buttonStates: ButtonState[] = ['default', 'hover', 'pressed', 'focus', 'disabled', 'loading']

const stateClass: Partial<Record<ButtonState, string>> = {
  hover: preview.buttonHover,
  pressed: preview.buttonPressed,
  focus: preview.focus,
}

// 시안에서 ‘–’인 칸(정의하지 않은 상태)은 비워 둔다
const buttonRows: {
  name: string
  label: string
  props: ButtonProps
  states: ButtonState[]
}[] = [
  { name: 'Primary', label: '결제하기', props: {}, states: buttonStates },
  {
    name: 'Secondary',
    label: '충전하기',
    props: { variant: 'outline' },
    states: ['default', 'hover', 'pressed', 'focus', 'disabled'],
  },
  {
    name: 'Ghost',
    label: '변경',
    props: { variant: 'subtle' },
    states: ['default', 'hover', 'pressed', 'focus', 'disabled'],
  },
  {
    name: 'Danger',
    label: '권한 회수',
    props: { color: 'red' },
    states: ['default', 'focus', 'disabled', 'loading'],
  },
  {
    name: 'Danger-outline',
    label: '탈퇴 신청',
    props: { color: 'red', variant: 'outline' },
    states: ['default', 'hover', 'focus', 'disabled'],
  },
]

export function ButtonSection() {
  return (
    <GallerySection
      id="button"
      title="버튼"
      meta="hover 150ms ease-out · 비활성일 때는 버튼 아래 이유 문구 · 로딩 중에는 중복 클릭을 막아요"
    >
      <Panel title="종류 × 상태">
        <div className={classes.tableScroll}>
          <div className={classes.stateTable}>
            <span />
            {buttonStates.map((state) => (
              <span key={state} className={classes.stateLabel}>
                {state}
              </span>
            ))}
            {buttonRows.map((row) => (
              <ButtonRow key={row.name} {...row} />
            ))}
          </div>
        </div>
      </Panel>
      <Panel title="크기 · 아이콘 버튼 · 비활성 이유">
        <StateGrid>
          <Measure selector="button" expected={52}>
            <Button size="lg">장바구니 담기</Button>
          </Measure>
          <Measure selector="button" expected={44}>
            <Button>장바구니 담기</Button>
          </Measure>
          <Measure selector="button" expected={36}>
            <Button size="sm" variant="outline">
              팔로우
            </Button>
          </Measure>
          <Measure selector="button" expected={44}>
            <Group gap="xs">
              <ActionIcon variant="default" aria-label="관심 상품에 추가">
                <Heart />
              </ActionIcon>
              <ActionIcon aria-label="더 보기">
                <EllipsisVertical />
              </ActionIcon>
            </Group>
          </Measure>
          <StateItem label="비활성 + 이유 문구">
            <Stack gap={6}>
              <Button disabled w={220} aria-describedby="pay-disabled-reason">
                45,800원 결제하기
              </Button>
              <Text
                id="pay-disabled-reason"
                c="var(--pd-color-text-secondary)"
                fz="var(--pd-font-caption)"
              >
                예치금이 부족해 결제할 수 없어요
              </Text>
            </Stack>
          </StateItem>
        </StateGrid>
      </Panel>
    </GallerySection>
  )
}

function ButtonRow({ name, label, props, states }: (typeof buttonRows)[number]) {
  return (
    <>
      <strong className={classes.rowName}>{name}</strong>
      {buttonStates.map((state) =>
        states.includes(state) ? (
          <div key={state}>
            <Button
              {...props}
              className={stateClass[state]}
              disabled={state === 'disabled'}
              loading={state === 'loading'}
            >
              {label}
            </Button>
          </div>
        ) : (
          <span key={state} className={classes.sectionMeta}>
            –
          </span>
        ),
      )}
    </>
  )
}

// ─── 입력 ─────────────────────────────────────────────────

export function InputSection() {
  return (
    <GallerySection
      id="input"
      title="입력 필드"
      meta="높이 48 · 라벨 위 · 도움말 13px muted 아래 · 오류는 테두리 + 아이콘 + 문구"
    >
      <Panel title="상태">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <StateItem label="default">
            <TextInput label="받는 분" placeholder="이름을 입력해 주세요" />
          </StateItem>
          <StateItem label="hover">
            <TextInput
              className={preview.inputHover}
              label="받는 분"
              placeholder="이름을 입력해 주세요"
            />
          </StateItem>
          <StateItem label="focus">
            <TextInput className={preview.inputFocus} label="받는 분" defaultValue="이서연" />
          </StateItem>
          <StateItem label="error">
            <PasswordInput
              label="비밀번호"
              defaultValue="abcdef"
              error="영문, 숫자, 특수문자를 모두 포함해 8~20자로 입력해 주세요"
            />
          </StateItem>
          <StateItem label="disabled">
            <TextInput label="송장번호" placeholder="택배사를 먼저 골라 주세요" disabled />
          </StateItem>
          <StateItem label="read-only">
            <TextInput label="아이디" value="seoyeon88" readOnly description="변경할 수 없어요" />
          </StateItem>
        </SimpleGrid>
      </Panel>
      <Panel title="입력 종류">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Measure selector="input" expected={48}>
            <NumberInput
              label="충전 금액"
              placeholder="20,000"
              thousandSeparator=","
              suffix="원"
              description="최소 20,000원부터 충전할 수 있어요"
            />
          </Measure>
          <Measure selector="select" expected={48}>
            <NativeSelect label="택배사" data={['CJ대한통운', '우체국택배', '한진택배']} />
          </Measure>
          <Measure selector="input" expected={48}>
            <Select label="택배사" defaultValue="CJ대한통운" data={['CJ대한통운', '우체국택배']} />
          </Measure>
          <StateItem label="Textarea">
            <Textarea
              label="문의 내용"
              placeholder="받은 상품의 상태를 적어 주세요"
              minRows={3}
              autosize
            />
          </StateItem>
          <StateItem label="셀렉트 · 열림 (목록 shadow md, 선택 tint, 옵션 44)">
            <div className={classes.openSelect}>
              <Select
                aria-label="정렬"
                defaultValue="최신 수확순"
                data={['최신 수확순', '낮은 가격순', '높은 가격순']}
                dropdownOpened
                comboboxProps={{ withinPortal: false }}
              />
            </div>
          </StateItem>
        </SimpleGrid>
      </Panel>
    </GallerySection>
  )
}

// ─── 선택 컨트롤 ───────────────────────────────────────────

const terms = [
  { label: '[필수] 전자금융거래 이용약관', checked: true },
  { label: '[필수] 선불전자지급수단 이용약관', checked: false, focus: true },
]

export function SelectionSection() {
  const [chips, setChips] = useState('전체')
  const [segment, setSegment] = useState('전체')

  return (
    <GallerySection
      id="selection"
      title="선택 컨트롤"
      meta="체크박스·라디오 20px, 행 전체(44)가 터치 영역 · 칩 36 pill · 탭 48 + 2px 밑줄"
    >
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Panel title="체크박스 · 라디오">
          <Stack gap={0}>
            <Checkbox label="전체 동의" defaultChecked fw={600} />
            {terms.map((term) => (
              <Group key={term.label} gap="xs" wrap="nowrap">
                <Checkbox
                  className={term.focus ? preview.checkboxFocus : undefined}
                  label={term.focus ? `${term.label} · focus` : term.label}
                  defaultChecked={term.checked}
                  flex={1}
                />
                <Anchor href="#selection" fz="sm">
                  보기
                </Anchor>
              </Group>
            ))}
            <Checkbox label="비활성" disabled />
            <Radio.Group defaultValue="mistake" aria-label="취소 사유">
              <Group gap="lg">
                <Radio value="mistake" label="주문 실수" />
                <Radio value="address" label="배송지 문제" />
                <Radio value="disabled" label="비활성" disabled />
              </Group>
            </Radio.Group>
          </Stack>
        </Panel>
        <Panel title="필터 칩 · 세그먼트 · 탭">
          <Stack gap="lg">
            <Chip.Group value={chips} onChange={(value) => setChips(value as string)}>
              <Group gap="xs">
                {['전체', '진행 중', '구매확정', '취소'].map((label) => (
                  <Chip key={label} value={label}>
                    {label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            <SegmentedControl
              value={segment}
              onChange={setSegment}
              data={['전체', '진행 중', '구매확정']}
            />
            <Tabs defaultValue="info">
              <Tabs.List>
                <Tabs.Tab value="info">상품 정보</Tabs.Tab>
                <Tabs.Tab value="farm">생산 정보</Tabs.Tab>
                <Tabs.Tab value="review">리뷰 128</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </Stack>
        </Panel>
      </SimpleGrid>
    </GallerySection>
  )
}

// ─── 배지 · 안내 박스 ──────────────────────────────────────

const toneIcons: Record<StatusTone, ReactNode> = {
  primary: <CircleCheck />,
  success: <CircleCheck />,
  warning: <TriangleAlert />,
  error: <CircleX />,
  info: <Info />,
  neutral: <Clock />,
  straw: null,
}

const tones: { tone: StatusTone; sample: string }[] = [
  { tone: 'warning', sample: '결제 대기' },
  { tone: 'error', sample: '결제 실패' },
  { tone: 'neutral', sample: '상품 준비 중' },
  { tone: 'info', sample: '배송 중' },
  { tone: 'success', sample: '배송 완료' },
  { tone: 'primary', sample: '구매확정' },
  { tone: 'straw', sample: '경북 청송' },
]

export function BadgeAlertSection() {
  return (
    <GallerySection
      id="badge"
      title="배지 · 인라인 안내 박스"
      meta="배지 높이 24 · radius 6 · 아이콘 12 · 색만으로 상태를 전달하지 않아요. 상태값 → 배지 매핑은 0-3-2 StatusBadge"
    >
      <Panel title="배지 톤 (color)">
        <Group gap="xs">
          {tones.map(({ tone, sample }) => (
            <Measure key={tone} selector=".mantine-Badge-root" expected={24}>
              <Badge color={tone} leftSection={toneIcons[tone]}>
                {sample}
              </Badge>
              <span className={classes.mono}>{tone}</span>
            </Measure>
          ))}
        </Group>
      </Panel>
      <Panel title="안내 박스 (Alert) · status 4종 + 버튼 1개">
        <Stack gap="sm">
          <Alert color="success" icon={<CircleCheck />} title="20,000원을 충전했어요">
            지금 잔액은 52,000원이에요.
          </Alert>
          <Alert color="warning" icon={<TriangleAlert />}>
            <Group justify="space-between" gap="sm">
              <div>
                <Text fw={600} fz="md" lh="1.375rem">
                  예치금이 13,800원 부족해요
                </Text>
                최소 충전 금액은 20,000원이에요
              </div>
              <Button size="sm" variant="outline">
                예치금 충전하기
              </Button>
            </Group>
          </Alert>
          <Alert color="error" icon={<CircleX />} title="결제하지 못했어요">
            예치금은 그대로예요.
          </Alert>
          <Alert color="info" icon={<Info />} title="충전 결과를 확인하고 있어요">
            최대 10분 정도 걸릴 수 있어요.
          </Alert>
        </Stack>
      </Panel>
    </GallerySection>
  )
}

// ─── 모달 · 바텀시트 · 토스트 ──────────────────────────────

export function OverlaySection() {
  const [modal, setModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [sheet, setSheet] = useState(false)

  // 닫을 수 없는 모달은 갤러리에서만 3초 뒤 자동으로 닫는다
  useEffect(() => {
    if (!processing) return
    const timer = setTimeout(() => setProcessing(false), 3000)
    return () => clearTimeout(timer)
  }, [processing])

  return (
    <GallerySection
      id="overlay"
      title="모달 · 바텀시트 · 토스트"
      meta="모달 최대 480 · radius 16 · 패딩 24 · 버튼 오른쪽(보조 → 주) · 결제 처리 중 모달은 닫을 수 없음 · 토스트 하단 중앙 4초"
    >
      <Panel>
        <Group gap="sm">
          <Button variant="outline" onClick={() => setModal(true)}>
            모달
          </Button>
          <Button variant="outline" onClick={() => setProcessing(true)}>
            닫을 수 없는 모달 (3초)
          </Button>
          <Button variant="outline" onClick={() => setSheet(true)}>
            바텀시트
          </Button>
          <Button variant="outline" onClick={() => showToast({ message: '장바구니에 담았어요' })}>
            토스트
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              showToast({
                message: '장바구니에 담았어요',
                action: { label: '장바구니 보기', onClick: () => {} },
              })
            }
          >
            토스트 + 액션
          </Button>
        </Group>
      </Panel>

      <Modal opened={modal} onClose={() => setModal(false)} title="구매확정할까요?">
        <Text c="inherit">구매확정 후에는 취소·환불을 할 수 없어요. 상품을 잘 받으셨나요?</Text>
        <Group justify="flex-end" gap="xs" mt="lg">
          <Button variant="outline" onClick={() => setModal(false)}>
            취소
          </Button>
          <Button onClick={() => setModal(false)}>구매확정</Button>
        </Group>
      </Modal>

      <Modal
        opened={processing}
        onClose={() => {}}
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        aria-label="결제 처리 중"
      >
        <Stack align="center" gap="sm" py="md">
          <Loader size="md" />
          <Text fw={600} c="var(--pd-color-text)">
            결제하고 있어요
          </Text>
          <Text size="sm">창을 닫지 말고 잠시만 기다려 주세요.</Text>
        </Stack>
      </Modal>

      <Drawer
        opened={sheet}
        onClose={() => setSheet(false)}
        position="bottom"
        size="auto"
        withCloseButton={false}
        title="로그인이 필요해요"
      >
        <Text c="inherit">로그인하고 장바구니에 담아 보세요.</Text>
        <Group gap="xs" mt="md" grow>
          <Button size="lg" variant="outline" onClick={() => setSheet(false)}>
            닫기
          </Button>
          <Button size="lg">로그인하기</Button>
        </Group>
      </Drawer>
    </GallerySection>
  )
}

// ─── 표 · 페이지네이션 · 사이드바 ──────────────────────────

const sellerRows = [
  { date: '10.12', name: '영암 무화과정원', owner: '최다은', status: 'applied' },
  { date: '10.11', name: '괴산 유기농콩밭', owner: '한상욱', status: 'reviewing', hover: true },
  { date: '10.11', name: '담양 대숲딸기', owner: '오미래', status: 'applied' },
] as const

export function DataSection() {
  const [page, setPage] = useState(1)

  return (
    <GallerySection
      id="data"
      title="표 · 페이지네이션 · 사이드바 · 스켈레톤 · 단계 · 별점"
      meta="헤더 44 · 행 52 · hover bg · 금액 오른쪽 정렬 · 행 액션 1개, 나머지는 더 보기 · 사이드바 240"
    >
      <Panel>
        <div className={classes.consoleDemo}>
          <nav aria-label="사이드바 예시" className={classes.sidebarDemo}>
            <NavLink href="#data" label="센터 홈" leftSection={<House />} />
            <NavLink
              href="#data"
              label="판매자 심사"
              leftSection={<ClipboardCheck />}
              rightSection={<Badge color="warning">2</Badge>}
              active
            />
            <NavLink
              href="#data"
              label="정산 관리 · hover"
              leftSection={<Wallet />}
              className={preview.navHover}
            />
          </nav>
          <Stack gap="md" miw={0} flex={1}>
            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
              <Table.ScrollContainer minWidth={640} type="native">
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>신청일</Table.Th>
                      <Table.Th>상호</Table.Th>
                      <Table.Th>대표자</Table.Th>
                      <Table.Th>상태</Table.Th>
                      <Table.Th ta="right">미처리 금액</Table.Th>
                      <Table.Th w={150}>
                        <VisuallyHidden>작업</VisuallyHidden>
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sellerRows.map((row) => (
                      <Table.Tr
                        key={row.name}
                        className={'hover' in row ? preview.rowHover : undefined}
                      >
                        <Table.Td>{row.date}</Table.Td>
                        <Table.Td fw={600}>{row.name}</Table.Td>
                        <Table.Td>{row.owner}</Table.Td>
                        <Table.Td>
                          {row.status === 'applied' ? (
                            <Badge color="warning" leftSection={<Clock />}>
                              신청 완료
                            </Badge>
                          ) : (
                            <Badge color="info" leftSection={<LoaderCircle />}>
                              심사 중
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td ta="right" c="dimmed">
                          –
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} justify="flex-end" wrap="nowrap">
                            {row.status === 'applied' ? (
                              <Button size="sm" variant="outline">
                                심사 시작
                              </Button>
                            ) : (
                              <Button size="sm">승인</Button>
                            )}
                            <ActionIcon
                              aria-label={`${row.name} 더 보기`}
                              c="var(--pd-color-text-secondary)"
                            >
                              <EllipsisVertical />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
            <Group justify="space-between" gap="md">
              <Pagination total={3} value={page} onChange={setPage} />
              <Group gap="sm">
                <Text c="dimmed" fz="var(--pd-font-caption)">
                  구매자 목록은
                </Text>
                <Button variant="outline">더 보기</Button>
              </Group>
            </Group>
          </Stack>
        </div>
      </Panel>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <Panel title="스켈레톤">
          <Stack gap={10}>
            <Skeleton style={{ aspectRatio: '2 / 1' }} />
            <Skeleton h={14} w="60%" />
            <Skeleton h={18} w="85%" />
            <Skeleton h={22} w="40%" />
          </Stack>
        </Panel>
        <Panel title="단계 (판매자 신청)">
          <Stepper active={1} orientation="vertical">
            <Stepper.Step label="상점 정보" description="상호·소개" />
            <Stepper.Step label="정산 계좌" description="은행·계좌번호" />
            <Stepper.Step label="확인" description="입력 내용 확인" />
          </Stepper>
        </Panel>
        <Panel title="별점 (fractions 2)">
          <Stack gap="sm">
            <StateItem label="읽기 전용 4.5">
              <Rating value={4.5} readOnly aria-label="별점 5점 만점에 4.5점" />
            </StateItem>
            <StateItem label="0점 (빈 별)">
              <Rating value={0} readOnly aria-label="별점 없음" />
            </StateItem>
            <StateItem label="입력">
              <Rating defaultValue={3} size="lg" />
            </StateItem>
          </Stack>
        </Panel>
      </SimpleGrid>
    </GallerySection>
  )
}
