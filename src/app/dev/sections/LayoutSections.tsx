import { Text } from '@mantine/core'
import classes from '../DesignGallery.module.css'
import { GallerySection, Panel } from '../GalleryParts'

// 0-4 레이아웃: /__design/preview/:layout 을 iframe으로 띄워 실제 미디어 쿼리(1440 · 390)로 본다.
// iframe 안에서 링크·메뉴·드로어를 눌러 볼 수 있다.

type Preview = { title: string; src: string; note?: string }

const previews: Preview[] = [
  {
    title: 'PublicLayout · 비회원 (홈: 모바일 로고 바 + 하단 탭)',
    src: '/__design/preview/public?state=guest',
  },
  {
    title: 'PublicLayout · 구매자 (장바구니 2)',
    src: '/__design/preview/public?state=buyer',
  },
  {
    title: 'PublicLayout · 판매자 (판매자 센터 버튼)',
    src: '/__design/preview/public?state=seller',
  },
  {
    title: 'PublicLayout · 하위 화면 (모바일은 PageHeader 뒤로 바, 하단 탭 ‘주문’ 화면)',
    src: '/__design/preview/public-sub',
  },
  { title: 'AuthLayout · 가운데 카드', src: '/__design/preview/auth' },
  {
    title: 'SellerLayout · 사이드바 240 + 대기 개수 (모바일: 메뉴 열기 → 드로어)',
    src: '/__design/preview/seller',
  },
  {
    title: 'AdminLayout · 어두운 상단 바 + 관리자 콘솔 배지',
    src: '/__design/preview/admin',
  },
]

function Frames({ title, src }: Preview) {
  return (
    <div className={classes.frames}>
      <div className={classes.frameBox} data-device="desktop">
        <span className={classes.stateLabel}>데스크톱 1440 (50%)</span>
        <div className={classes.frameScroll}>
          <div className={classes.frameScaler} data-device="desktop">
            <iframe
              src={src}
              title={`${title} 데스크톱`}
              width={1440}
              height={900}
              loading="lazy"
            />
          </div>
        </div>
      </div>
      <div className={classes.frameBox} data-device="mobile">
        <span className={classes.stateLabel}>모바일 390 (75%)</span>
        <div className={classes.frameScroll}>
          <div className={classes.frameScaler} data-device="mobile">
            <iframe src={src} title={`${title} 모바일`} width={390} height={844} loading="lazy" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function LayoutSection() {
  return (
    <GallerySection
      id="layouts"
      title="레이아웃"
      meta="0-4: Public · Auth · Seller · Admin. 미리보기는 /__design/preview/:layout (새 탭으로 열어 창 크기를 바꿔 봐도 돼요)"
    >
      {previews.map((preview) => (
        <Panel key={preview.src} title={preview.title}>
          <Frames {...preview} />
          <Text size="sm" mt="xs">
            <a href={preview.src} target="_blank" rel="noreferrer">
              새 탭으로 열기
            </a>
          </Text>
        </Panel>
      ))}
    </GallerySection>
  )
}
