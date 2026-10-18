import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  FileButton,
  Group,
  Loader,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { CircleX, ExternalLink, Users } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import type { SellerProfile } from '@/shared/api/types'
import { MAX_IMAGE_MB, STORE_INTRO_MAX } from '@/shared/lib/constants'
import { formatAmount } from '@/shared/lib/format'
import { EmptyView, FarmAvatar, PageHeader, QueryState } from '@/shared/ui'
import { type ProfileFormValues, profileSchema } from '../schemas'
import type { Follower } from '../types'
import classes from './SellerProfileView.module.css'

// S-09 상점 프로필 · 팔로워 /seller/profile. 시안: seller/SellerProfile, SellerProfileMobile
// 사진(없으면 상호 첫 글자) · 상호명 · 대표자 · 고객센터 · 소개 200자 · 팔로워 목록(닉네임만) · 빈 상태
// TODO(api): 📝 GET/PATCH /sellers/me, GET /sellers/me/followers, 사진은 POST /media/SELLER_PROFILE

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type MaybeAsync = unknown

export type SellerProfileViewProps = {
  status: 'pending' | 'error' | 'success'
  profile?: SellerProfile
  onSave: (values: ProfileFormValues) => MaybeAsync
  saving?: boolean
  onPhotoChange: (file: File) => void
  onPhotoRemove: () => void
  photoUploading?: boolean
  photoError?: string | null
  followers: Follower[]
  hasMoreFollowers?: boolean
  loadingMoreFollowers?: boolean
  onLoadMoreFollowers?: () => void
  onRetry?: () => void
}

function ProfileForm({
  profile,
  onSave,
  saving,
  onPhotoChange,
  onPhotoRemove,
  photoUploading,
  photoError,
}: Required<Pick<SellerProfileViewProps, 'profile'>> &
  Pick<
    SellerProfileViewProps,
    'onSave' | 'saving' | 'onPhotoChange' | 'onPhotoRemove' | 'photoUploading' | 'photoError'
  >) {
  const [pickError, setPickError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      storeName: profile.storeName,
      representativeName: profile.representativeName,
      customerServicePhone: profile.customerServicePhone ?? '',
      introduction: profile.introduction ?? '',
    },
  })
  const storeName = watch('storeName')
  const introLength = watch('introduction')?.length ?? 0
  const shownPhotoError = pickError ?? photoError

  const pick = (file: File | null) => {
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) return setPickError('jpg·png·webp 사진만 올릴 수 있어요')
    if (file.size > MAX_IMAGE_MB * 1024 * 1024)
      return setPickError(`사진은 ${MAX_IMAGE_MB}MB 이하로 올려 주세요`)
    setPickError(null)
    onPhotoChange(file)
  }

  return (
    <form className={classes.card} onSubmit={handleSubmit((values) => onSave(values))} noValidate>
      <div className={classes.photo}>
        <div className={classes.avatar}>
          <FarmAvatar
            name={storeName || profile.storeName}
            imageUrl={profile.profileImageUrl}
            size={96}
          />
          {photoUploading && (
            <span className={classes.uploading} role="status" aria-label="사진 올리는 중">
              <Loader size="sm" />
            </span>
          )}
        </div>
        <div className={classes.photoBody}>
          <span className={classes.label}>프로필 사진</span>
          <Group gap="xs">
            <FileButton onChange={pick} accept={IMAGE_TYPES.join(',')}>
              {(props) => (
                <Button variant="outline" size="sm" disabled={photoUploading} {...props}>
                  {profile.profileImageUrl ? '사진 바꾸기' : '사진 올리기'}
                </Button>
              )}
            </FileButton>
            {profile.profileImageUrl && (
              <Button variant="subtle" size="sm" onClick={onPhotoRemove} disabled={photoUploading}>
                삭제
              </Button>
            )}
          </Group>
          <span className={classes.help}>
            1:1 비율, {MAX_IMAGE_MB}MB 이하 · 없으면 상호 첫 글자로 보여요
          </span>
          {shownPhotoError && (
            <p className={classes.error} role="alert">
              <CircleX size={16} aria-hidden="true" />
              {shownPhotoError}
            </p>
          )}
        </div>
      </div>

      <div className={classes.grid}>
        <TextInput label="상호명" error={errors.storeName?.message} {...register('storeName')} />
        <TextInput
          label="대표자명"
          error={errors.representativeName?.message}
          {...register('representativeName')}
        />
        <TextInput
          label="고객센터 연락처"
          inputMode="tel"
          placeholder="054-873-2210"
          classNames={{ input: 'pd-num' }}
          error={errors.customerServicePhone?.message}
          {...register('customerServicePhone')}
        />
      </div>
      <Textarea
        label="상점 소개"
        placeholder="어떤 농가인지, 무엇을 키우는지 알려 주세요"
        autosize
        minRows={3}
        maxLength={STORE_INTRO_MAX}
        description={`상점과 상품 상세의 ‘생산 정보’에 보여요 · ${formatAmount(introLength)} / ${STORE_INTRO_MAX}자`}
        error={errors.introduction?.message}
        {...register('introduction')}
      />
      <Group justify="flex-end">
        <Button type="submit" loading={saving}>
          저장
        </Button>
      </Group>
    </form>
  )
}

export function SellerProfileView({
  status,
  profile,
  followers,
  hasMoreFollowers = false,
  loadingMoreFollowers = false,
  onLoadMoreFollowers,
  onRetry,
  ...formProps
}: SellerProfileViewProps) {
  return (
    <div className={classes.root}>
      <PageHeader
        title="상점 프로필"
        hideOnMobile
        actions={
          profile && (
            <Button
              component={Link}
              to={`/farms/${profile.sellerId}`}
              variant="subtle"
              rightSection={<ExternalLink size={16} aria-hidden="true" />}
            >
              구매자에게 보이는 상점 보기
            </Button>
          )
        }
      />
      {/* 모바일: 제목 줄(PageHeader)을 판매자 레이아웃이 그리므로 바로가기를 본문에 둔다 */}
      {profile && (
        <Button
          component={Link}
          to={`/farms/${profile.sellerId}`}
          variant="subtle"
          hiddenFrom="md"
          className={classes.storeLink}
          rightSection={<ExternalLink size={16} aria-hidden="true" />}
        >
          구매자에게 보이는 상점 보기
        </Button>
      )}
      <QueryState
        status={status === 'success' && !profile ? 'error' : status}
        skeleton={
          <Stack gap="md">
            <Skeleton h={360} radius="md" />
            <Skeleton h={200} radius="md" />
          </Stack>
        }
        onRetry={onRetry}
      >
        {profile && (
          <div className={classes.columns}>
            <ProfileForm profile={profile} {...formProps} />

            <section className={classes.card} aria-labelledby="seller-followers">
              <div className={classes.cardHead}>
                <h2 id="seller-followers" className={classes.cardTitle}>
                  팔로워
                </h2>
                <span className="pd-num">{formatAmount(profile.followerCount)}명</span>
              </div>
              {followers.length === 0 ? (
                <EmptyView
                  icon={<Users />}
                  title="아직 팔로워가 없어요"
                  description="상품을 올리고 상점을 알리면 팔로워가 생겨요."
                />
              ) : (
                <>
                  <Text className={classes.help}>팔로워는 닉네임만 보여요</Text>
                  <ul className={classes.followers}>
                    {followers.map((follower) => (
                      <li key={follower.memberId}>
                        <FarmAvatar name={follower.nickname} size={32} />
                        {follower.nickname}
                      </li>
                    ))}
                  </ul>
                  {hasMoreFollowers && onLoadMoreFollowers && (
                    <Button
                      variant="outline"
                      loading={loadingMoreFollowers}
                      onClick={onLoadMoreFollowers}
                    >
                      팔로워 더 보기
                    </Button>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </QueryState>
    </div>
  )
}
