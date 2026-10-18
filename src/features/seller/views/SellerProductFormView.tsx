import { zodResolver } from '@hookform/resolvers/zod'
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Modal,
  NativeSelect,
  NumberInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { CircleX, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Controller,
  type FieldErrors,
  type FieldPath,
  useFieldArray,
  useForm,
} from 'react-hook-form'
import { Link } from 'react-router'
import {
  ProductCategory,
  ProductRegion,
  ProductStatus,
  type ProductSummary,
  type ProductUpdateRequest,
  ProductVisibility,
} from '@/shared/api/types'
import { MAX_IMAGE_MB, PRODUCT_IMAGE_MAX } from '@/shared/lib/constants'
import { categoryLabels, productStatusLabels, regionLabels } from '@/shared/lib/labels'
import { useServerFieldErrors } from '@/shared/lib/useServerFieldErrors'
import { DisabledReason, PageHeader, type PhotoItem, PhotoUploader, ProductCard } from '@/shared/ui'
import { OPTION_MAX, type ProductFormValues, productSchema, textToHtml } from '../productSchema'
import classes from './SellerProductFormView.module.css'

// S-05 상품 등록 · 수정. 시안: seller/SellerProductForm, SellerProductFormMobile
// API 기준(✅): 사진 1~10장, 옵션 1~50개(옵션명 중복 불가, 판매가 ≤ 정가 ≤ 1억), 판매 상태 4종 + 공개 여부.
// 생산자·상세 지역·수확일·기본 옵션·설명 사진은 API에 없어 두지 않는다(A-2).
// 제출에 실패하면 위에 오류 요약(누르면 그 칸으로)을 보여 준다. 수정은 version이 다르면 409.
// 사진은 다 올린 것(서버 url)만 넘기고, 올리는 중이면 저장을 막는다.

type MaybeAsync = unknown

/** 폼이 넘기는 값 (수정이면 페이지가 version을 붙인다) */
export type ProductFormResult = Omit<ProductUpdateRequest, 'version'>

export type SellerProductFormViewProps = {
  mode: 'create' | 'edit'
  defaultValues?: Partial<ProductFormValues>
  photos: PhotoItem[]
  onAddPhotos: (files: File[]) => void
  onRemovePhoto: (id: string) => void
  onMovePhoto: (id: string, direction: -1 | 1) => void
  /** 업로드 실패 등 사진 칸 오류 */
  photoError?: string | null
  /** 사진을 올리는 중 → 저장을 막고 이유를 보여 준다 */
  uploading?: boolean
  onSubmit: (values: ProductFormResult) => MaybeAsync
  submitting?: boolean
  /** 서버 오류 (서버 detail) */
  errorMessage?: string | null
  /** 서버 422 errors[].path를 폼 경로로 바꾼 칸별 오류. 바뀔 때마다 붙이고 첫 칸으로 focus한다 */
  fieldErrors?: Partial<Record<FieldPath<ProductFormValues>, string>>
  /** 수정 충돌(409): 다른 곳에서 먼저 고침 */
  conflict?: boolean
  onReload?: () => void
  onDelete?: () => MaybeAsync
  deleting?: boolean
  /** 처음부터 오류 요약을 보여 준다 (미리보기) */
  defaultShowErrors?: boolean
  defaultDeleteOpen?: boolean
}

const emptyOption = { name: '', salePrice: undefined as unknown as number, totalStock: 0 }

/**
 * NumberInput 값 → 폼 숫자. Mantine은 '011'처럼 앞에 0이 붙은 값을 문자열로 넘기므로 숫자로 바꾼다.
 * 빈 칸이나 숫자가 아닌 값은 undefined → 스키마의 ‘입력해 주세요’ 문구로 남긴다
 */
const toNumber = (value: string | number): number | undefined => {
  if (typeof value === 'number') return value
  const trimmed = value.replace(/,/g, '').trim()
  if (trimmed === '') return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

const defaults: ProductFormValues = {
  category: ProductCategory.FRUIT,
  name: '',
  region: ProductRegion.GYEONGBUK,
  description: '',
  options: [emptyOption],
  status: ProductStatus.READY,
  visibility: ProductVisibility.HIDDEN,
}

const saleHelp: Record<ProductStatus, string> = {
  [ProductStatus.READY]: '구매자에게 ‘판매 예정’으로 보이고 담을 수 없어요.',
  [ProductStatus.ON_SALE]: '공개 상태면 바로 주문을 받을 수 있어요.',
  [ProductStatus.PAUSED]: '잠시 주문을 막아요. 다시 판매 중으로 바꾸면 이어서 팔 수 있어요.',
  [ProductStatus.ENDED]: '판매를 끝내요. 기존 주문은 그대로 처리해야 해요.',
}

type ErrorLink = { id: string; text: string }

function collectErrors(errors: FieldErrors<ProductFormValues>, photoMissing: boolean): ErrorLink[] {
  const list: ErrorLink[] = []
  if (errors.name?.message) list.push({ id: 'product-name', text: errors.name.message })
  if (photoMissing) list.push({ id: 'product-photos', text: '상품 사진을 1장 이상 올려 주세요' })
  if (errors.description?.message)
    list.push({ id: 'product-description', text: errors.description.message })
  errors.options?.forEach?.((optionErrors, i) => {
    if (!optionErrors) return
    for (const key of ['name', 'salePrice', 'listPrice', 'totalStock'] as const) {
      const message = optionErrors[key]?.message
      if (message) list.push({ id: `option-${i}-${key}`, text: `옵션 ${i + 1}: ${message}` })
    }
  })
  if (errors.options?.root?.message)
    list.push({ id: 'product-options', text: errors.options.root.message })
  return list
}

export function SellerProductFormView({
  mode,
  defaultValues,
  photos,
  onAddPhotos,
  onRemovePhoto,
  onMovePhoto,
  photoError,
  uploading = false,
  onSubmit,
  submitting = false,
  errorMessage,
  fieldErrors,
  conflict = false,
  onReload,
  onDelete,
  deleting = false,
  defaultShowErrors = false,
  defaultDeleteOpen = false,
}: SellerProductFormViewProps) {
  const [submitted, setSubmitted] = useState(defaultShowErrors)
  const [deleteOpen, setDeleteOpen] = useState(defaultDeleteOpen)
  const {
    control,
    register,
    handleSubmit,
    watch,
    trigger,
    setError,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { ...defaults, ...defaultValues },
  })
  useServerFieldErrors(setError, fieldErrors)
  const { fields, append, remove } = useFieldArray({ control, name: 'options' })
  const values = watch()
  const title = mode === 'edit' ? '상품 수정' : '상품 등록'
  // 다 올린 사진만 (올리는 중인 사진의 url은 브라우저 미리보기 주소다)
  const uploaded = photos.filter((photo) => photo.progress === undefined)
  const photoMissing = submitted && photos.length === 0
  const errorList = submitted ? collectErrors(errors, photoMissing) : []

  // 미리보기: 오류 요약을 바로 보여 주려고 처음에 한 번 검사한다
  useEffect(() => {
    if (defaultShowErrors) void trigger()
  }, [defaultShowErrors, trigger])

  const submit = handleSubmit(
    (form) => {
      setSubmitted(true)
      if (uploading || uploaded.length === 0) return
      onSubmit({
        name: form.name,
        descriptionHtml: textToHtml(form.description),
        category: form.category,
        region: form.region,
        status: form.status,
        visibility: form.visibility,
        imageUrls: uploaded.map((photo) => photo.url),
        options: form.options.map(({ id, name, salePrice, listPrice, totalStock }) => ({
          ...(id === undefined ? {} : { id }),
          name,
          salePrice,
          ...(listPrice === undefined ? {} : { listPrice }),
          totalStock,
        })),
      })
    },
    () => setSubmitted(true),
  )

  // 미리보기 카드: 옵션 중 최저 판매가 (API의 minSalePrice와 같은 규칙)
  const priced = (values.options ?? []).filter(
    (o) => typeof o.salePrice === 'number' && o.salePrice > 0,
  )
  const cheapest = priced.reduce<(typeof priced)[number] | undefined>(
    (min, o) => (!min || o.salePrice < min.salePrice ? o : min),
    undefined,
  )
  const preview: ProductSummary = {
    productId: 0,
    name: values.name || '상품명이 여기에 보여요',
    thumbnailUrl: photos[0]?.url ?? '',
    minSalePrice: cheapest?.salePrice ?? 0,
    minPriceListPrice: cheapest?.listPrice ?? cheapest?.salePrice ?? 0,
    discountRate:
      cheapest?.listPrice && cheapest.listPrice > cheapest.salePrice
        ? Math.floor(((cheapest.listPrice - cheapest.salePrice) / cheapest.listPrice) * 100)
        : 0,
    category: values.category,
    region: values.region,
    status: values.status,
    soldOut: priced.length > 0 && priced.every((o) => o.totalStock === 0),
    reviewCount: 0,
    averageRating: 0,
  }
  const previewNote =
    values.visibility === ProductVisibility.HIDDEN
      ? '비공개라 구매자에게 아직 보이지 않아요'
      : values.status === ProductStatus.ON_SALE
        ? '구매자에게 보이고 주문할 수 있어요'
        : `구매자에게 ‘${productStatusLabels[values.status]}’ 상태로 보여요`

  return (
    <div className={classes.root} id="product-form">
      <PageHeader
        title={title}
        hideOnMobile
        breadcrumbs={[{ label: '상품 관리', to: '/seller/products' }, { label: title }]}
      />

      {conflict && (
        <Alert
          color="warning"
          icon={<RefreshCw />}
          title="다른 곳에서 먼저 수정한 상품이에요"
          role="alert"
        >
          <Stack gap="sm" align="flex-start">
            최신 내용을 불러온 뒤 다시 고쳐 주세요. 지금 입력한 내용은 저장되지 않았어요.
            {onReload && (
              <Button variant="outline" size="sm" onClick={onReload}>
                최신 내용 불러오기
              </Button>
            )}
          </Stack>
        </Alert>
      )}
      {(errorList.length > 0 || errorMessage) && (
        <Alert
          color="error"
          icon={<CircleX />}
          title="입력값을 확인해 주세요. 저장되지 않았어요"
          role="alert"
        >
          {errorMessage && <p className={classes.alertText}>{errorMessage}</p>}
          {errorList.length > 0 && (
            <ul className={classes.errorList}>
              {errorList.map((error) => (
                <li key={error.id}>
                  <a
                    href={`#${error.id}`}
                    onClick={(event) => {
                      const target = document.getElementById(error.id)
                      if (!target) return
                      event.preventDefault()
                      target.scrollIntoView({ block: 'center' })
                      target.focus({ preventScroll: true })
                    }}
                  >
                    {error.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <form onSubmit={submit} noValidate className={classes.layout}>
        <Stack gap="md">
          <section className={classes.card} aria-labelledby="sec-basic">
            <h2 id="sec-basic" className={classes.sectionTitle}>
              <span className={classes.step}>1</span>기본 정보
            </h2>
            <div className={classes.grid}>
              <NativeSelect
                label="카테고리"
                data={Object.values(ProductCategory).map((c) => ({
                  value: c,
                  label: categoryLabels[c],
                }))}
                {...register('category')}
              />
              <NativeSelect
                label="산지 (시·도)"
                description="구매자 화면의 산지 꼬리표로 보여요"
                data={Object.values(ProductRegion).map((r) => ({
                  value: r,
                  label: regionLabels[r],
                }))}
                {...register('region')}
              />
            </div>
            <TextInput
              id="product-name"
              label="상품명"
              placeholder="예: 청송 꿀사과 부사"
              maxLength={100}
              error={errors.name?.message}
              {...register('name')}
            />
          </section>

          <section className={classes.card} aria-labelledby="sec-photos">
            <h2 id="sec-photos" className={classes.sectionTitle}>
              <span className={classes.step}>2</span>상품 사진
            </h2>
            <div id="product-photos" tabIndex={-1}>
              <PhotoUploader
                label="상품 사진"
                items={photos}
                max={PRODUCT_IMAGE_MAX}
                maxSizeMb={MAX_IMAGE_MB}
                onAdd={onAddPhotos}
                onRemove={onRemovePhoto}
                onMove={onMovePhoto}
                error={photoMissing ? '상품 사진을 1장 이상 올려 주세요' : photoError}
              />
            </div>
            <Text className={classes.help}>
              첫 번째 사진이 대표 사진이에요. 앞·뒤 버튼으로 순서를 바꿔요.
            </Text>
          </section>

          <section className={classes.card} aria-labelledby="sec-desc">
            <h2 id="sec-desc" className={classes.sectionTitle}>
              <span className={classes.step}>3</span>상품 설명
            </h2>
            <Textarea
              id="product-description"
              label="설명"
              description="어떻게 키웠는지, 상자에 몇 개 들었는지, 보관법을 알려 주세요. 빈 줄로 문단을 나눠요."
              autosize
              minRows={6}
              error={errors.description?.message}
              {...register('description')}
            />
          </section>

          <section
            className={classes.card}
            aria-labelledby="sec-options"
            id="product-options"
            tabIndex={-1}
          >
            <div>
              <h2 id="sec-options" className={classes.sectionTitle}>
                <span className={classes.step}>4</span>옵션
              </h2>
              <Text className={classes.help}>
                옵션은 1개 이상 · 가격과 재고는 옵션마다 따로 관리해요 · 정가를 넣으면 할인율이
                보여요
              </Text>
            </div>
            <ol className={classes.options}>
              {fields.map((field, i) => {
                const opt = values.options?.[i]
                const discount =
                  opt?.listPrice && opt.salePrice && opt.listPrice > opt.salePrice
                    ? Math.floor(((opt.listPrice - opt.salePrice) / opt.listPrice) * 100)
                    : 0
                const optionErrors = errors.options?.[i]
                return (
                  <li key={field.id} className={classes.option}>
                    <div className={classes.optionHead}>
                      <span className={classes.optionNo}>옵션 {i + 1}</span>
                      <ActionIcon
                        aria-label={`옵션 ${i + 1} 삭제`}
                        disabled={fields.length === 1}
                        onClick={() => remove(i)}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </ActionIcon>
                    </div>
                    <div className={classes.optionGrid}>
                      <TextInput
                        id={`option-${i}-name`}
                        label="옵션명"
                        placeholder="예: 2kg (11~13과)"
                        className={classes.optionName}
                        error={optionErrors?.name?.message}
                        {...register(`options.${i}.name`)}
                      />
                      <Controller
                        control={control}
                        name={`options.${i}.salePrice`}
                        render={({ field: f }) => (
                          <NumberInput
                            id={`option-${i}-salePrice`}
                            label="판매가"
                            thousandSeparator=","
                            allowDecimal={false}
                            allowNegative={false}
                            hideControls
                            rightSection={<span aria-hidden="true">원</span>}
                            classNames={{ input: 'pd-num' }}
                            value={f.value ?? ''}
                            onChange={(v) => f.onChange(toNumber(v))}
                            onBlur={f.onBlur}
                            ref={f.ref}
                            error={optionErrors?.salePrice?.message}
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name={`options.${i}.listPrice`}
                        render={({ field: f }) => (
                          <NumberInput
                            id={`option-${i}-listPrice`}
                            label="정가 (선택)"
                            thousandSeparator=","
                            allowDecimal={false}
                            allowNegative={false}
                            hideControls
                            rightSection={<span aria-hidden="true">원</span>}
                            classNames={{ input: 'pd-num' }}
                            value={f.value ?? ''}
                            onChange={(v) => f.onChange(toNumber(v))}
                            onBlur={f.onBlur}
                            ref={f.ref}
                            description={discount > 0 ? `${discount}% 할인으로 보여요` : undefined}
                            error={optionErrors?.listPrice?.message}
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name={`options.${i}.totalStock`}
                        render={({ field: f }) => (
                          <NumberInput
                            id={`option-${i}-totalStock`}
                            label="재고"
                            allowDecimal={false}
                            allowNegative={false}
                            hideControls
                            rightSection={<span aria-hidden="true">개</span>}
                            classNames={{ input: 'pd-num' }}
                            value={f.value ?? ''}
                            onChange={(v) => f.onChange(toNumber(v))}
                            onBlur={f.onBlur}
                            ref={f.ref}
                            description={f.value === 0 ? '재고 0이면 품절로 보여요' : undefined}
                            error={optionErrors?.totalStock?.message}
                          />
                        )}
                      />
                    </div>
                  </li>
                )
              })}
            </ol>
            <Group gap="sm">
              <Button
                variant="outline"
                size="sm"
                leftSection={<Plus size={16} aria-hidden="true" />}
                onClick={() => append(emptyOption)}
                disabled={fields.length >= OPTION_MAX}
              >
                옵션 추가
              </Button>
              {fields.length === 1 && (
                <Text className={classes.help}>
                  마지막 옵션은 삭제할 수 없어요 (옵션은 1개 이상)
                </Text>
              )}
            </Group>
          </section>

          <section className={classes.card} aria-labelledby="sec-sale">
            <h2 id="sec-sale" className={classes.sectionTitle}>
              <span className={classes.step}>5</span>판매 설정
            </h2>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <div className={classes.field}>
                  <span className={classes.label} id="sale-status-label">
                    판매 상태
                  </span>
                  <SegmentedControl
                    aria-labelledby="sale-status-label"
                    value={field.value}
                    onChange={(v) => field.onChange(v as ProductStatus)}
                    data={Object.values(ProductStatus).map((s) => ({
                      value: s,
                      label: productStatusLabels[s],
                    }))}
                    fullWidth
                  />
                  <Text className={classes.help}>{saleHelp[field.value]}</Text>
                </div>
              )}
            />
            <Controller
              control={control}
              name="visibility"
              render={({ field }) => (
                <Switch
                  label={field.value === ProductVisibility.VISIBLE ? '공개' : '비공개'}
                  description="비공개 상품은 구매자에게 보이지 않아요. 판매 상태와 따로 관리해요."
                  checked={field.value === ProductVisibility.VISIBLE}
                  onChange={(event) =>
                    field.onChange(
                      event.currentTarget.checked
                        ? ProductVisibility.VISIBLE
                        : ProductVisibility.HIDDEN,
                    )
                  }
                />
              )}
            />
          </section>
        </Stack>

        <aside className={classes.preview} aria-labelledby="product-preview">
          <h2 id="product-preview" className={classes.previewTitle}>
            구매자에게 보이는 모습
          </h2>
          <div className={classes.previewCard}>
            <ProductCard product={preview} optionCount={fields.length} to="#product-form" />
          </div>
          <Text className={classes.help}>{previewNote}</Text>
        </aside>

        <div className={classes.bar}>
          {mode === 'edit' && onDelete && (
            <Button color="red" variant="outline" onClick={() => setDeleteOpen(true)}>
              삭제
            </Button>
          )}
          <span className={classes.spacer} />
          <Button component={Link} to="/seller/products" variant="outline">
            취소
          </Button>
          <DisabledReason
            reason={
              uploading
                ? `사진을 다 올린 뒤 ${mode === 'edit' ? '저장' : '등록'}할 수 있어요`
                : null
            }
          >
            <Button type="submit" disabled={uploading} loading={submitting}>
              {mode === 'edit' ? '저장' : '등록하기'}
            </Button>
          </DisabledReason>
        </div>
      </form>

      <Modal opened={deleteOpen} onClose={() => setDeleteOpen(false)} title="상품을 삭제할까요?">
        <Text>
          삭제한 상품은 다시 판매할 수 없어요. 기존 주문 내역은 주문할 때 정보 그대로 유지돼요.
        </Text>
        <Group justify="flex-end" gap="xs" mt="lg">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            닫기
          </Button>
          <Button color="red" loading={deleting} onClick={() => onDelete?.()}>
            삭제
          </Button>
        </Group>
      </Modal>
    </div>
  )
}
