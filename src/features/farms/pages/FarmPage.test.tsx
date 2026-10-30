import { screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { render } from '@/test/render'
import { FarmPage } from './FarmPage'

// 상점·판매자별 상품 API가 없어 /farms/:farmId는 ‘연결 전’만 보여 준다(가짜 상점·팔로우를 그리지 않는다)

describe('FarmPage (연결 전)', () => {
  it('상점 정보 대신 연결 전 안내를 보여 주고 팔로우 버튼을 그리지 않는다', async () => {
    const router = createMemoryRouter([{ path: '/farms/:farmId', Component: FarmPage }], {
      initialEntries: ['/farms/7'],
    })
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { level: 1, name: '농가 상점' })).toBeInTheDocument()
    expect(screen.getByText('농가 상점은 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.queryByText('청송 햇살농원')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /팔로우/ })).not.toBeInTheDocument()
  })
})
