import { zodResolver } from '@hookform/resolvers/zod'
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Group,
  NativeSelect,
  Radio,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core'
import { CircleCheck, CircleX, Clock, MessageCircleQuestion } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { OrderItemStatus } from '@/shared/api/types'
import { MAX_IMAGE_MB } from '@/shared/lib/constants'
import { formatAmount, formatDate } from '@/shared/lib/format'
import {
  DisabledReason,
  EmptyView,
  PageHeader,
  type PhotoItem,
  PhotoUploader,
  StatusBadge,
} from '@/shared/ui'
import { OrderItemRow } from '../components/OrderItemRow'
import { inquiryPlaceholders, inquiryTypeLabels } from '../labels'
import { INQUIRY_MAX, type InquiryFormValues, inquirySchema } from '../schemas'
import { type Inquiry, type InquiryTarget, InquiryType } from '../types'
import classes from './SupportView.module.css'

// 고객센터 문의 (배송 후 문제) /orders/:orderId/inquiry. 시안: b2c/Support, SupportMobile
// 유형 4종 · 내용 10~1,000자 · 사진 3장(장당 10MB). 답변은 영업일 1~2일, 이메일 알림(C-8).
// TODO(api): ❌ 문의 접수·내역 API 없음 (주문 상세에서 링크하지 않는 fixtures 전용 화면)

export type InquiryDone = {
  inquiryNumber: string
  productName: string
  type: InquiryType
  photoCount: number
}

/** 그냥 끝나거나 Promise를 돌려준다 (2단계 mutateAsync) */
type MaybeAsync = unknown

export type SupportViewProps = {
  orderId: number
  /** 문의할 수 있는 상품 (배송 완료) */
  targets: InquiryTarget[]
  defaultOrderItemId?: number
  inquiries: Inquiry[]
  photos: PhotoItem[]
  onAddPhotos: (files: File[]) => void
  onRemovePhoto: (id: string) => void
  photoError?: string | null
  onSubmit: (values: InquiryFormValues) => MaybeAsync
  submitting?: boolean
  /** 보내기 실패 문구 */
  errorMessage?: string | null
  /** 접수 완료면 폼 대신 결과 */
  completed?: InquiryDone | null
  onWriteAnother?: () => void
  /** 답변 알림 이메일 */
  replyEmail?: string
}

function DoneCard({
  done,
  orderId,
  onWriteAnother,
}: {
  done: InquiryDone
  orderId: number
  onWriteAnother?: () => void
}) {
  return (
    <section className={`${classes.card} ${classes.done}`} aria-labelledby="inquiry-done">
      <ThemeIcon color="success" variant="light" size={56} radius="50%" aria-hidden="true">
        <CircleCheck size={28} />
      </ThemeIcon>
      <h2 id="inquiry-done" className={classes.doneTitle} role="status">
        문의를 접수했어요
      </h2>
      <Text c="var(--pd-color-text-secondary)">
        영업일 기준 1~2일 안에 답변드려요. 답변이 등록되면 이메일로 알려 드려요.
      </Text>
      <dl className={classes.facts}>
        <div>
          <dt>문의 번호</dt>
          <dd className="pd-num">{done.inquiryNumber}</dd>
        </div>
        <div>
          <dt>문의 상품</dt>
          <dd>{done.productName}</dd>
        </div>
        <div>
          <dt>문의 유형</dt>
          <dd>{inquiryTypeLabels[done.type]}</dd>
        </div>
        <div>
          <dt>사진</dt>
          <dd className="pd-num">{done.photoCount > 0 ? `${done.photoCount}장` : '없음'}</dd>
        </div>
      </dl>
      <Group gap="xs" justify="center">
        <Button component={Link} to={`/orders/${orderId}`} variant="outline">
          주문 상세로
        </Button>
        {onWriteAnother && <Button onClick={onWriteAnother}>다른 문의 쓰기</Button>}
      </Group>
    </section>
  )
}

function InquiryList({ inquiries }: { inquiries: Inquiry[] }) {
  if (inquiries.length === 0) {
    return (
      <div className={classes.card}>
        <EmptyView
          icon={<MessageCircleQuestion />}
          title="아직 문의한 내역이 없어요"
          description="문의를 보내면 여기에서 답변을 확인할 수 있어요."
        />
      </div>
    )
  }
  return (
    <Accordion variant="separated" radius="md" chevronPosition="right">
      {inquiries.map((inquiry) => (
        <Accordion.Item key={inquiry.inquiryId} value={String(inquiry.inquiryId)}>
          <Accordion.Control>
            <Stack gap={4}>
              <Group gap="xs">
                {inquiry.answer ? (
                  <Badge color="success" leftSection={<CircleCheck aria-hidden="true" />}>
                    답변 완료
                  </Badge>
                ) : (
                  <Badge color="warning" leftSection={<Clock aria-hidden="true" />}>
                    답변 대기
                  </Badge>
                )}
                <span className={`pd-num ${classes.help}`}>
                  {formatDate(inquiry.createdAt, 'dateTime')}
                </span>
              </Group>
              <strong>{inquiryTypeLabels[inquiry.type]}</strong>
              <span className={`pd-num ${classes.help}`}>
                {inquiry.productName} · {inquiry.inquiryNumber}
              </span>
            </Stack>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <div className={classes.bubble}>
                <span className={classes.help}>
                  내 문의 · 주문번호 <span className="pd-num">{inquiry.orderNumber}</span>
                </span>
                <p>{inquiry.content}</p>
                {inquiry.photoCount > 0 && (
                  <span className={`pd-num ${classes.help}`}>사진 {inquiry.photoCount}장 첨부</span>
                )}
              </div>
              {inquiry.answer ? (
                <div className={`${classes.bubble} ${classes.answer}`}>
                  <span className={classes.help}>
                    팔도곳간 고객센터 ·{' '}
                    <span className="pd-num">
                      {formatDate(inquiry.answer.answeredAt, 'dateTime')}
                    </span>
                  </span>
                  <p>{inquiry.answer.content}</p>
                </div>
              ) : (
                <p className={classes.help}>
                  답변을 준비하고 있어요. 영업일 기준 1~2일 안에 답변드려요.
                </p>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}

export function SupportView({
  orderId,
  targets,
  defaultOrderItemId,
  inquiries,
  photos,
  onAddPhotos,
  onRemovePhoto,
  photoError,
  onSubmit,
  submitting = false,
  errorMessage,
  completed,
  onWriteAnother,
  replyEmail,
}: SupportViewProps) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      orderItemId: defaultOrderItemId ?? targets[0]?.orderItemId,
      type: InquiryType.DAMAGED,
      content: '',
    },
  })
  const [orderItemId, type, content] = watch(['orderItemId', 'type', 'content'])
  const target = targets.find((t) => t.orderItemId === orderItemId)
  const uploading = photos.some((p) => p.progress !== undefined && p.progress < 100)
  const orderPath = `/orders/${orderId}`

  return (
    <div className={classes.root}>
      <PageHeader
        title="고객센터 문의"
        backTo={orderPath}
        breadcrumbs={[
          { label: '주문 내역', to: '/orders' },
          { label: '주문 상세', to: orderPath },
          { label: '고객센터 문의' },
        ]}
      />
      <p className={classes.lead}>
        받은 상품에 문제가 있으면 사진과 함께 알려 주세요. 팔도곳간 고객센터가 판매자와 확인한 뒤
        답변드려요.
      </p>

      <div className={classes.layout}>
        <div>
          {completed ? (
            <DoneCard done={completed} orderId={orderId} onWriteAnother={onWriteAnother} />
          ) : (
            <form onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
              <Stack gap="md">
                {errorMessage && (
                  <Alert
                    color="error"
                    icon={<CircleX />}
                    title="문의를 보내지 못했어요"
                    role="alert"
                  >
                    {errorMessage}
                  </Alert>
                )}
                <section className={classes.card} aria-label="문의 쓰기">
                  <Controller
                    control={control}
                    name="orderItemId"
                    render={({ field }) => (
                      <NativeSelect
                        label="문의할 상품"
                        data={targets.map((t) => ({
                          value: String(t.orderItemId),
                          label: `${t.productName} · ${t.productOptionName}`,
                        }))}
                        value={String(field.value ?? '')}
                        onChange={(event) => field.onChange(Number(event.currentTarget.value))}
                        error={errors.orderItemId?.message}
                      />
                    )}
                  />
                  {target && (
                    <div className={classes.target}>
                      <OrderItemRow
                        item={target}
                        meta={
                          <>
                            <StatusBadge status={OrderItemStatus.DELIVERED} />
                            <span className="pd-num">주문번호 {target.orderNumber}</span>
                          </>
                        }
                      />
                    </div>
                  )}

                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Radio.Group
                        label="문의 유형"
                        value={field.value}
                        onChange={(value) => field.onChange(value as InquiryType)}
                        error={errors.type?.message}
                      >
                        <div className={classes.types}>
                          {Object.values(InquiryType).map((value) => (
                            <Radio.Card key={value} value={value} className={classes.typeCard}>
                              <Group gap="xs" wrap="nowrap">
                                <Radio.Indicator />
                                {inquiryTypeLabels[value]}
                              </Group>
                            </Radio.Card>
                          ))}
                        </div>
                      </Radio.Group>
                    )}
                  />

                  <Textarea
                    label="내용"
                    placeholder={inquiryPlaceholders[type]}
                    autosize
                    minRows={5}
                    maxLength={INQUIRY_MAX}
                    description={`10자 이상, ${formatAmount(INQUIRY_MAX)}자까지 · 지금 ${formatAmount(content.length)}자`}
                    error={errors.content?.message}
                    {...register('content')}
                  />

                  <div>
                    <PhotoUploader
                      label="사진 (선택)"
                      items={photos}
                      max={3}
                      maxSizeMb={MAX_IMAGE_MB}
                      onAdd={onAddPhotos}
                      onRemove={onRemovePhoto}
                      error={photoError}
                    />
                    <Text className={classes.help} mt={6}>
                      파손·변질은 상자와 상품이 함께 보이게, 오배송은 송장 라벨이 보이게 찍어 주시면
                      더 빨리 확인할 수 있어요.
                    </Text>
                  </div>

                  <section className={classes.reply} aria-labelledby="inquiry-reply">
                    <h2 id="inquiry-reply" className={classes.replyTitle}>
                      답변은 이렇게 받아요
                    </h2>
                    <dl className={classes.facts}>
                      {replyEmail && (
                        <div>
                          <dt>답변 알림</dt>
                          <dd className="pd-num">이메일 {replyEmail}</dd>
                        </div>
                      )}
                      <div>
                        <dt>답변 확인</dt>
                        <dd>이 화면 ‘내 문의 내역’</dd>
                      </div>
                      <div>
                        <dt>답변 시간</dt>
                        <dd className="pd-num">영업일 기준 1~2일 · 평일 10:00~17:00</dd>
                      </div>
                    </dl>
                    <p className={classes.help}>
                      상품은 회수하지 않아요. 사진을 남긴 뒤 자체 폐기해 주세요. 환불 금액은
                      관리자가 판매자와 협의해 정하고, 결제 금액을 넘지 않아요.
                    </p>
                  </section>
                </section>

                <Group justify="flex-end" gap="xs" align="flex-start">
                  <Button component={Link} to={orderPath} variant="outline">
                    취소
                  </Button>
                  <DisabledReason reason={uploading ? '사진을 다 올린 뒤 보낼 수 있어요' : null}>
                    <Button type="submit" disabled={uploading} loading={submitting}>
                      문의 보내기
                    </Button>
                  </DisabledReason>
                </Group>
              </Stack>
            </form>
          )}
        </div>

        <aside aria-labelledby="inquiry-list" className={classes.aside}>
          <div className={classes.asideHead}>
            <h2 id="inquiry-list" className={classes.replyTitle}>
              내 문의 내역
            </h2>
            <span className={`pd-num ${classes.help}`}>{inquiries.length}건</span>
          </div>
          <InquiryList inquiries={inquiries} />
          <p className={classes.help}>
            급한 문제는 판매자 고객센터로도 연락할 수 있어요. 연락처는 상품 상세의 ‘생산 정보’에
            있어요.
          </p>
        </aside>
      </div>
    </div>
  )
}
