import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { myProfile } from '../fixtures'
import { SellerProfilePage } from './SellerPages'

const S3 = 'https://bucket.s3.ap-northeast-2.amazonaws.com/seller-profile'

const problem = (status: number, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/seller/profile']}>
      <SellerProfilePage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

beforeEach(() => setAccessToken(fakeToken({ memberId: 7, role: MemberRole.SELLER })))
afterEach(() => clearAccessToken())

describe('SellerProfilePage', () => {
  it('404(등록 전)면 빈 폼을 그리고, 등록하면 POST 201 → 수정 모드로 바뀐다', async () => {
    let body: unknown
    server.use(
      http.get('*/api/v1/sellers/me/profile', () =>
        problem(404, '판매자 프로필을 찾을 수 없습니다.'),
      ),
      http.post('*/api/v1/sellers/me/profile', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...myProfile, introduction: null }, { status: 201 })
      }),
    )
    const user = renderPage()

    const submit = await screen.findByRole('button', { name: '등록' })
    await user.type(screen.getByLabelText('상호명'), myProfile.storeName)
    await user.type(screen.getByLabelText('대표자명'), myProfile.representativeName)
    await user.type(screen.getByLabelText('고객센터 연락처'), myProfile.customerServicePhone)
    await user.click(submit)

    expect(await screen.findByText('상점 프로필을 등록했어요')).toBeInTheDocument()
    expect(body).toEqual({
      storeName: myProfile.storeName,
      representativeName: myProfile.representativeName,
      customerServicePhone: myProfile.customerServicePhone,
      introduction: null,
      profileImageUrl: null,
    })
    expect(await screen.findByRole('button', { name: '저장' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '팔로워' })).toBeInTheDocument()
    expect(screen.getByText('팔로워는 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.queryByText('아직 팔로워가 없어요')).not.toBeInTheDocument()
  })

  it('등록된 프로필은 PUT으로 저장하고, 사진을 삭제하면 profileImageUrl null을 보낸다', async () => {
    let body: unknown
    server.use(
      http.get('*/api/v1/sellers/me/profile', () =>
        HttpResponse.json({ ...myProfile, profileImageUrl: `${S3}/old.jpg` }),
      ),
      http.put('*/api/v1/sellers/me/profile', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...myProfile, profileImageUrl: null })
      }),
    )
    const user = renderPage()

    expect(await screen.findByDisplayValue(myProfile.storeName)).toBeInTheDocument()
    expect(document.querySelector(`img[src="${S3}/old.jpg"]`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '삭제' }))
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('상점 프로필을 저장했어요')).toBeInTheDocument()
    expect(body).toMatchObject({ storeName: myProfile.storeName, profileImageUrl: null })
  })

  it('422 customerServicePhone은 그 칸에 붙이고 focus한다', async () => {
    server.use(
      http.put('*/api/v1/sellers/me/profile', () =>
        problem(422, '요청 값이 올바르지 않습니다.', {
          errors: [
            {
              detail: '고객센터 연락처 형식이 올바르지 않습니다.',
              pointer: '/customerServicePhone',
              path: 'customerServicePhone',
            },
          ],
        }),
      ),
    )
    const user = renderPage()
    await user.click(await screen.findByRole('button', { name: '저장' }))

    expect(await screen.findByText('고객센터 연락처 형식이 올바르지 않습니다.')).toBeInTheDocument()
    expect(screen.getByLabelText('고객센터 연락처')).toHaveFocus()
  })

  it('사진을 올리는 동안 저장을 막고, 다 올리면 그 url을 보낸다', async () => {
    let finishUpload: () => void = () => {}
    let body: unknown
    server.use(
      http.post('*/api/v1/media/SELLER_PROFILE', async () => {
        await new Promise<void>((resolve) => {
          finishUpload = resolve
        })
        return HttpResponse.json({ mediaId: 9, url: `${S3}/new.jpg` }, { status: 201 })
      }),
      http.put('*/api/v1/sellers/me/profile', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...myProfile, profileImageUrl: `${S3}/new.jpg` })
      }),
    )
    const user = renderPage()
    await screen.findByRole('button', { name: '저장' })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['x'], 'me.jpg', { type: 'image/jpeg' }))

    const save = screen.getByRole('button', { name: '저장' })
    expect(save).toBeDisabled()
    expect(save).toHaveAccessibleDescription('사진을 다 올린 뒤 저장할 수 있어요')

    finishUpload()
    await waitFor(() => expect(save).toBeEnabled())
    await user.click(save)
    await waitFor(() => expect(body).toMatchObject({ profileImageUrl: `${S3}/new.jpg` }))
  })
})
