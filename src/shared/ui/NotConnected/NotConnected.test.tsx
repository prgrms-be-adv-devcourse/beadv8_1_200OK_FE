import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { NotConnected, NotConnectedValue } from './NotConnected'

describe('NotConnected', () => {
  it('연결 전 안내와(개발 환경에서) 필요한 API를 보여 준다', () => {
    render(<NotConnected api="GET /sellers/me/orders" />)
    expect(screen.getByText('아직 연결되지 않은 화면이에요')).toBeInTheDocument()
    expect(screen.getByText('필요한 API: GET /sellers/me/orders')).toBeInTheDocument()
  })

  it('모르는 값은 화면엔 –, 화면 읽기 프로그램엔 ‘연결 전’으로 알린다', () => {
    render(<NotConnectedValue />)
    expect(screen.getByText('연결 전')).toBeInTheDocument()
    expect(screen.getByText('–')).toHaveAttribute('aria-hidden', 'true')
  })
})
