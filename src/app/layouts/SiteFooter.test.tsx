import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { MemberRole, TermsType } from '@/shared/api/types'
import { SITE_INFO } from '@/shared/lib/constants'
import { render } from '@/test/render'
import type { Session } from '../session'
import { SiteFooterView, type SiteFooterViewProps } from './SiteFooter'

// 기준: design/FOOTER.md ‘8. 확인’

function renderFooter(props: SiteFooterViewProps) {
  render(
    <MemoryRouter>
      <SiteFooterView {...props} />
    </MemoryRouter>,
  )
  return within(screen.getByRole('contentinfo'))
}

const guest: Session = { status: 'guest' }
const seller: Session = { status: 'authenticated', role: MemberRole.SELLER, memberId: 3 }
const buyer: Session = { status: 'authenticated', role: MemberRole.BUYER, memberId: 4 }

describe('SiteFooter', () => {
  it('푸터 랜드마크 하나 안에 사이트 정보 링크 목록이 있고, 약관 링크가 약관 화면으로 간다', () => {
    const footer = renderFooter({ variant: 'full', session: guest })
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
    const nav = footer.getByRole('navigation', { name: '사이트 정보' })
    expect(within(nav).getByRole('link', { name: '이용약관' })).toHaveAttribute(
      'href',
      `/terms/${TermsType.ELECTRONIC_FINANCIAL_TRANSACTION}`,
    )
    expect(within(nav).getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
      'href',
      `/terms/${TermsType.PERSONAL_INFORMATION_COLLECTION}`,
    )
  })

  it('비로그인이면 입점 신청이 보이고 고객센터는 전화로 건다', () => {
    const nav = within(renderFooter({ variant: 'full', session: guest }).getByRole('navigation'))
    expect(nav.getByRole('link', { name: '판매자 입점 신청' })).toHaveAttribute(
      'href',
      '/seller/apply',
    )
    expect(nav.queryByRole('link', { name: '판매자 센터' })).not.toBeInTheDocument()
    expect(nav.getByRole('link', { name: '고객센터' })).toHaveAttribute(
      'href',
      `tel:${SITE_INFO.csPhone}`,
    )
  })

  it('판매자면 판매자 센터가 보이고 입점 신청은 없다', () => {
    const nav = within(renderFooter({ variant: 'full', session: seller }).getByRole('navigation'))
    expect(nav.getByRole('link', { name: '판매자 센터' })).toHaveAttribute('href', '/seller')
    expect(nav.queryByRole('link', { name: '판매자 입점 신청' })).not.toBeInTheDocument()
  })

  it('로그인하면 고객센터·1:1 문의하기가 주문 내역으로 간다(문의는 주문 단위)', () => {
    const footer = renderFooter({ variant: 'full', session: buyer })
    expect(footer.getByRole('link', { name: '고객센터' })).toHaveAttribute('href', '/orders')
    expect(footer.getByRole('link', { name: '1:1 문의하기' })).toHaveAttribute('href', '/orders')
  })

  it('사업자 정보 펼침 버튼은 처음 닫혀 있고, 누르면 펼친다', async () => {
    const footer = renderFooter({ variant: 'full', session: guest })
    const toggle = footer.getByRole('button', { name: '팔도곳간 사업자 정보' })
    const biz = document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(biz).not.toHaveAttribute('data-open')

    await userEvent.setup().click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(biz).toHaveAttribute('data-open')
    expect(within(biz as HTMLElement).getByText(SITE_INFO.businessNumber)).toBeInTheDocument()
  })

  it('간단형은 링크 3개뿐이고 사업자 정보·펼침 버튼이 없다', () => {
    const footer = renderFooter({ variant: 'compact' })
    expect(footer.getAllByRole('link').map((link) => link.textContent)).toEqual([
      '이용약관',
      '개인정보처리방침',
      '고객센터',
    ])
    expect(footer.queryByRole('button')).not.toBeInTheDocument()
    expect(footer.queryByText('상호')).not.toBeInTheDocument()
  })
})
