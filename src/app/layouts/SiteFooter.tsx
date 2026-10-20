import { Button } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { ChevronDown } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Link } from 'react-router'
import { MemberRole, TermsType } from '@/shared/api/types'
import { SITE_INFO } from '@/shared/lib/constants'
import { Logo } from '@/shared/ui'
import type { Session } from '../session'
import classes from './SiteFooter.module.css'

// 사이트 푸터. 기준: design/FOOTER.md, 시안 common/Footer
// - full: 구매자 화면(PublicLayout). 데스크톱·모바일 마크업은 하나이고 CSS로 바꾼다
//   (모바일은 사업자 정보를 접어 두고 버튼으로 펼침, 로고·‘1:1 문의하기’·판매자 센터는 데스크톱만)
// - compact: 로그인·가입(AuthLayout). 이용약관 · 개인정보처리방침 · 고객센터만
// TODO(api): 사업자 정보·링크 대상은 자리 표시(C-14). 개인정보처리방침·고객센터 화면이 생기면 바꾼다.

export type SiteFooterViewProps = {
  variant: 'full' | 'compact'
  /** 링크 보이기 판단용. compact는 없어도 된다(고객센터는 전화) */
  session?: Session
  className?: string
}

type FooterLink = { label: string; to: string; strong?: boolean; desktopOnly?: boolean }

const BIZ_ID = 'site-footer-biz'

const bizRows: [string, string][] = [
  ['상호', SITE_INFO.companyName],
  ['대표', SITE_INFO.ceo],
  ['사업자등록번호', SITE_INFO.businessNumber],
  ['통신판매업 신고', SITE_INFO.mailOrderNumber],
  ['주소', SITE_INFO.address],
  ['개인정보 보호책임자', SITE_INFO.privacyOfficer],
  ['이메일', SITE_INFO.email],
]

function linksOf(variant: SiteFooterViewProps['variant'], session?: Session): FooterLink[] {
  const loggedIn = session?.status === 'authenticated'
  const isSeller = loggedIn && session.role === MemberRole.SELLER
  // 문의는 주문 단위라 로그인하면 주문 내역으로, 비로그인이면 전화
  const support = loggedIn ? '/orders' : `tel:${SITE_INFO.csPhone}`
  const links: FooterLink[] = [
    { label: '이용약관', to: `/terms/${TermsType.ELECTRONIC_FINANCIAL_TRANSACTION}` },
    {
      label: '개인정보처리방침',
      to: `/terms/${TermsType.PERSONAL_INFORMATION_COLLECTION}`,
      strong: true,
    },
    { label: '고객센터', to: support },
  ]
  if (variant === 'compact') return links
  return isSeller
    ? [...links, { label: '판매자 센터', to: '/seller', desktopOnly: true }]
    : [...links, { label: '판매자 입점 신청', to: '/seller/apply' }]
}

/** 전화(tel:)는 a, 앱 안 주소는 Link. Mantine Button의 component로도 쓰므로 나머지 속성을 넘긴다 */
function FooterAnchor({
  to,
  children,
  ...rest
}: { to: string; children: ReactNode } & Omit<ComponentPropsWithoutRef<'a'>, 'href'>) {
  return to.startsWith('tel:') ? (
    <a href={to} {...rest}>
      {children}
    </a>
  ) : (
    <Link to={to} {...rest}>
      {children}
    </Link>
  )
}

export function SiteFooterView({ variant, session, className }: SiteFooterViewProps) {
  const [bizOpen, biz] = useDisclosure(false)
  const links = linksOf(variant, session)
  const support = links.find((link) => link.label === '고객센터')?.to ?? `tel:${SITE_INFO.csPhone}`

  const nav = (
    <nav aria-label="사이트 정보">
      <ul className={classes.links}>
        {links.map((link) => (
          <li key={link.label} data-desktop-only={link.desktopOnly || undefined}>
            <FooterAnchor
              to={link.to}
              className={link.strong ? `${classes.link} ${classes.strong}` : classes.link}
            >
              {link.label}
            </FooterAnchor>
          </li>
        ))}
      </ul>
    </nav>
  )

  if (variant === 'compact') {
    return (
      <footer
        className={[classes.root, className].filter(Boolean).join(' ')}
        data-variant="compact"
      >
        {nav}
      </footer>
    )
  }

  return (
    <footer className={[classes.root, className].filter(Boolean).join(' ')} data-variant="full">
      <div className={classes.inner}>
        <div className={classes.top}>
          <Link to="/" className={classes.brand}>
            <Logo preset="console" />
          </Link>
          {nav}
        </div>
        <hr className={classes.divider} />

        <button
          type="button"
          className={classes.toggle}
          aria-expanded={bizOpen}
          aria-controls={BIZ_ID}
          onClick={biz.toggle}
        >
          팔도곳간 사업자 정보
          <ChevronDown size={20} aria-hidden="true" />
        </button>

        <div className={classes.body}>
          <div id={BIZ_ID} className={classes.details} data-open={bizOpen || undefined}>
            <dl className={classes.biz} aria-label="사업자 정보">
              {bizRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className={classes.cs}>
              <span className={classes.csLabel}>고객센터</span>
              <a className={classes.tel} href={`tel:${SITE_INFO.csPhone}`}>
                {SITE_INFO.csPhone}
              </a>
              <span className={classes.hours}>
                {SITE_INFO.csHours}
                <span className={classes.closedDesktop}>{SITE_INFO.csClosed}</span>
                <span className={classes.closedMobile}> · 주말·공휴일 휴무</span>
              </span>
              <Button
                component={FooterAnchor}
                to={support}
                variant="outline"
                size="sm"
                className={classes.inquiry}
              >
                1:1 문의하기
              </Button>
            </div>
          </div>
          <p className={classes.note}>
            팔도곳간은 통신판매중개자로, 통신판매의 당사자가 아니에요. 상품 정보와 거래에 대한
            책임은 각 판매자에게 있어요.
          </p>
        </div>

        <p className={classes.copy}>© 2026 팔도곳간</p>
      </div>
    </footer>
  )
}
