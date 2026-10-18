import { NavLink, UnstyledButton } from '@mantine/core'
import { ChevronRight, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { MemberRole } from '@/shared/api/types'
import { showToast } from '@/shared/ui'
import { useSession } from '../session'
import classes from './MyPageLayout.module.css'

// 마이페이지 묶음(/me, /me/wallet, /me/likes, /me/account) 레이아웃. PublicLayout 안에 들어간다.
// 데스크톱(≥ 1024): 왼쪽 메뉴 240 + 본문. 모바일: 본문만, 마이 홈(/me) 아래에 같은 메뉴를 목록으로.
// 시안: b2c/MyPage·Wallet·Likes·Account(.mside), MyPageMobile(메뉴 목록)

/** 판매자 메뉴 문구를 정하는 상태. TODO(api): ‘심사 중’은 📝 신청 현황 API가 생기면 채운다 */
export type SellerMenuStatus = 'none' | 'applying' | 'approved'

type MenuItem = { label: string; to: string }

const sellerMenu: Record<SellerMenuStatus, MenuItem> = {
  none: { label: '판매자 신청', to: '/seller/apply' },
  applying: { label: '판매자 신청 현황', to: '/seller/apply/status' },
  approved: { label: '판매자 센터', to: '/seller' },
}

function menuGroups(status: SellerMenuStatus): { title: string | null; items: MenuItem[] }[] {
  return [
    { title: null, items: [{ label: '마이페이지 홈', to: '/me' }] },
    {
      title: '쇼핑',
      items: [
        { label: '주문 내역', to: '/orders' },
        { label: '지갑 이용 내역', to: '/me/wallet' },
        { label: '관심 상품', to: '/me/likes?tab=products' },
        { label: '팔로우한 농가', to: '/me/likes?tab=farms' },
      ],
    },
    {
      title: '계정',
      items: [
        { label: '내 정보 수정', to: '/me/account?tab=info' },
        { label: '배송지 관리', to: '/me/account?tab=address' },
        sellerMenu[status],
        { label: '회원 탈퇴', to: '/me/account?tab=withdraw' },
      ],
    },
  ]
}

/** 주소의 경로가 같고, 메뉴에 탭이 있으면 탭까지 같을 때 활성 */
function isActive(to: string, current: URL) {
  const target = new URL(to, 'http://local')
  if (target.pathname !== current.pathname) return false
  const tab = target.searchParams.get('tab')
  if (!tab) return true
  const currentTab = current.searchParams.get('tab')
  // 탭이 없으면 첫 탭(관심 상품 · 내 정보 수정)을 연 것으로 본다
  return currentTab === tab || (!currentTab && (tab === 'products' || tab === 'info'))
}

export type MyPageLayoutViewProps = {
  sellerStatus: SellerMenuStatus
  onLogout: () => void
  /** 활성 메뉴를 고를 주소 (기본: 지금 주소). 갤러리 미리보기용 */
  currentPath?: string
  children: ReactNode
}

export function MyPageLayoutView({
  sellerStatus,
  onLogout,
  currentPath,
  children,
}: MyPageLayoutViewProps) {
  const location = useLocation()
  const url = new URL(currentPath ?? `${location.pathname}${location.search}`, 'http://local')
  const groups = menuGroups(sellerStatus)
  const isHome = url.pathname === '/me'

  return (
    <div className={classes.root}>
      <nav aria-label="마이페이지 메뉴" className={classes.side}>
        {groups.map((group) => (
          <div key={group.title ?? 'home'} className={classes.group}>
            {group.title && <span className={classes.groupTitle}>{group.title}</span>}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                component={Link}
                to={item.to}
                label={item.label}
                active={isActive(item.to, url)}
                aria-current={isActive(item.to, url) ? 'page' : undefined}
              />
            ))}
          </div>
        ))}
        <UnstyledButton className={classes.logout} onClick={onLogout}>
          <LogOut size={20} aria-hidden="true" />
          로그아웃
        </UnstyledButton>
      </nav>

      <div className={classes.content}>
        {children}

        {/* 모바일 마이 홈: 같은 메뉴를 목록으로 (홈 항목 제외) */}
        {isHome && (
          <div className={classes.mobileMenu}>
            <nav aria-label="마이페이지 메뉴 목록" className={classes.menuCard}>
              {groups
                .flatMap((group) => group.items)
                .filter((item) => item.to !== '/me')
                .map((item) => (
                  <Link key={item.to} to={item.to} className={classes.menuRow}>
                    {item.label}
                    <ChevronRight size={20} aria-hidden="true" />
                  </Link>
                ))}
            </nav>
            <UnstyledButton className={classes.logout} onClick={onLogout}>
              <LogOut size={20} aria-hidden="true" />
              로그아웃
            </UnstyledButton>
          </div>
        )}
      </div>
    </div>
  )
}

/** 라우트용 */
export function MyPageLayout() {
  const session = useSession()
  const navigate = useNavigate()
  const sellerStatus: SellerMenuStatus =
    session.status === 'authenticated' && session.role === MemberRole.SELLER ? 'approved' : 'none'

  return (
    <MyPageLayoutView
      sellerStatus={sellerStatus}
      onLogout={() => {
        // TODO(api): 2-1 로그아웃 = 클라이언트에서 토큰 삭제 + 캐시 정리(로그아웃 API 없음, A-12)
        showToast({ message: '로그아웃했어요' })
        navigate('/', { replace: true })
      }}
    >
      <Outlet />
    </MyPageLayoutView>
  )
}
