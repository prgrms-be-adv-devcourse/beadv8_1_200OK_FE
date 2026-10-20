import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { Logo } from '@/shared/ui'
import classes from './AuthLayout.module.css'
import { SiteFooterView } from './SiteFooter'
import { SkipLink } from './SkipLink'

// 로그인·가입·계정 찾기. 데스크톱: 가운데 로고(명조 32) + 흰 카드(최대 488, 패딩 32).
// 모바일: 카드 없이 바로 본문. 화면 제목·뒤로는 각 화면의 PageHeader가 그린다.
// 시안: b2c/Auth, AuthMobile

export function AuthLayoutView({ children }: { children: ReactNode }) {
  return (
    <div className={classes.root}>
      <SkipLink />
      <div className={classes.column}>
        <Link to="/" className={classes.logo}>
          <Logo preset="auth" />
        </Link>
        <main id="main" className={classes.card}>
          {children}
        </main>
        <SiteFooterView variant="compact" />
      </div>
    </div>
  )
}

export function AuthLayout() {
  return (
    <AuthLayoutView>
      <Outlet />
    </AuthLayoutView>
  )
}
