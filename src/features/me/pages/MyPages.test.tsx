import { notifications } from '@mantine/notifications'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { productSummaries } from '@/features/products/fixtures'
import { pageOf } from '@/mocks/handlers/_shared'
import { sampleDefaultAddress } from '@/mocks/handlers/addresses'
import { wishesOf } from '@/mocks/handlers/wishes'
import { server } from '@/mocks/server'
import {
  clearAccessToken,
  getAuthSession,
  getRefreshToken,
  setAccessToken,
} from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { AccountPage, LikesPage, MyPage } from './MyPages'

const openPostcode = vi.hoisted(() =>
  vi.fn(async (onPick: (picked: { zipCode: string; address: string }) => void) =>
    onPick({ zipCode: '63000', address: '제주특별자치도 제주시 첨단로 242' }),
  ),
)
vi.mock('@/shared/lib/daumPostcode', () => ({ openPostcode }))

const registered = http.get('*/api/v1/shipments/addresses/default', () =>
  HttpResponse.json(sampleDefaultAddress),
)

/** 찜 목록 응답 (최근 찜 순 ID) */
const wishList = (ids: number[]) =>
  http.get('*/api/v1/members/me/wishes', ({ request }) =>
    HttpResponse.json(pageOf(wishesOf(ids), new URL(request.url).searchParams)),
  )

// 마이페이지 예치금: GET /wallets/me/balance(기본 128,000 / 한도 500,000)

function renderMy() {
  const router = createMemoryRouter([{ path: '/me', Component: MyPage }], {
    initialEntries: ['/me'],
  })
  render(<RouterProvider router={router} />)
}

afterEach(() => clearAccessToken())

describe('MyPage', () => {
  it('서버 잔액과 남은 한도를 보여 준다', async () => {
    renderMy()
    expect(await screen.findByText('128,000')).toBeInTheDocument()
    expect(screen.getByText('지금 최대 372,000원까지 충전할 수 있어요')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /상품 준비 중/ })[0]).toHaveAttribute(
      'href',
      '/orders',
    )
  })

  it('내 정보(닉네임·아이디·이름)를 서버 값으로 보여 준다', async () => {
    renderMy()
    expect(await screen.findByText('풀떼기먹자')).toBeInTheDocument()
    expect(screen.getByText('tester01 · 김철수')).toBeInTheDocument()
  })

  it('내 정보를 못 받으면 프로필 자리에만 오류와 다시 시도를 보이고 예치금은 그대로 보인다', async () => {
    server.use(
      http.get('*/api/v1/members/me', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Not Found', status: 404, detail: 'x', instance: '/x' },
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    renderMy()
    expect(await screen.findByText('128,000')).toBeInTheDocument()
    expect(await screen.findByText(/내 정보를 찾을 수 없어요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('로그인 정보가 없으면 배송지를 부르지 않고 연결 전(–)으로 둔다(0이나 가짜 값을 그리지 않는다)', async () => {
    renderMy()
    expect(await screen.findByText('128,000')).toBeInTheDocument()
    expect(screen.queryByText('등록 전이에요')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /연결 전\s*상품 준비 중/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /관심 상품.*연결 전/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /팔로우한 농가.*연결 전/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /배송지.*연결 전/ })).toBeInTheDocument()
  })

  it('구매자는 관심 상품 수(찜 목록 totalElements)를 바로가기에 보여 준다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    server.use(wishList(Array.from({ length: 37 }, (_, i) => 101 + i)))
    renderMy()
    expect(await screen.findByRole('link', { name: /관심 상품\s*37/ })).toHaveAttribute(
      'href',
      '/me/likes?tab=products',
    )
  })

  it('구매자는 기본 배송지 요약(시·구)을 바로가기에 보여 준다', async () => {
    server.use(registered)
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    renderMy()
    expect(await screen.findByRole('link', { name: /배송지.*서울 중구/ })).toHaveAttribute(
      'href',
      '/me/account?tab=address',
    )
  })

  it('기본 배송지가 없으면(204) 등록 전이라고 알린다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    renderMy()
    expect(await screen.findByText('등록 전이에요')).toBeInTheDocument()
  })

  it('관리자는 기본 배송지를 부르지 않는다(구매자 API)', async () => {
    let called = false
    server.use(
      http.get('*/api/v1/shipments/addresses/default', () => {
        called = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    setAccessToken(fakeToken({ role: MemberRole.ADMIN }))
    renderMy()
    await screen.findByRole('heading', { level: 1 })
    expect(called).toBe(false)
  })

  it('판매자도 기본 배송지를 불러온다(BUYER 권한을 함께 가짐)', async () => {
    setAccessToken(fakeToken({ role: MemberRole.SELLER }))
    renderMy()
    expect(await screen.findByText('등록 전이에요')).toBeInTheDocument()
  })

  it('잔액을 못 받으면 다시 시도를 보여 준다', async () => {
    server.use(
      http.get('*/api/v1/wallets/me/balance', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Error', status: 500, detail: 'x', instance: '/x' },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    renderMy()
    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('판매자 신청이 심사 중이면 판매자 카드가 신청 현황으로 안내한다', async () => {
    server.use(
      http.get('*/api/v1/sellers/me/applications', () =>
        HttpResponse.json({
          applications: [
            {
              applicationId: 1,
              status: 'IN_REVIEW',
              appliedAt: '2026-10-19T10:00:00',
              reviewStartedAt: '2026-10-20T09:00:00',
              approvedAt: null,
              rejectedAt: null,
              rejectReason: null,
            },
          ],
        }),
      ),
    )
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    renderMy()
    expect(await screen.findByRole('link', { name: '신청 현황 보기' })).toHaveAttribute(
      'href',
      '/seller/apply/status',
    )
    expect(screen.getByText('판매자 심사 중')).toBeInTheDocument()
  })

  it('판매자 토큰이면 판매자 센터로 안내한다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.SELLER }))
    renderMy()
    expect(await screen.findByRole('link', { name: '판매자 센터로 가기' })).toHaveAttribute(
      'href',
      '/seller',
    )
  })
})

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/me/likes', Component: LikesPage },
      { path: '/me/account', Component: AccountPage },
      { path: '/login', Component: () => <h1>로그인 화면</h1> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

describe('LikesPage', () => {
  const apple = '청송 꿀사과 부사' // 101
  const gyul = '제주 노지 조생 감귤' // 103

  beforeEach(() => setAccessToken(fakeToken({ role: MemberRole.BUYER })))
  afterEach(() => notifications.clean())

  it('찜 목록을 상품 카드로 그리고, 숨김·삭제돼 빠진 상품 수를 알린다', async () => {
    const summaryIds: (string | null)[] = []
    server.use(
      wishList([103, 9999, 101]),
      http.get('*/api/v1/products/summaries', ({ request }) => {
        summaryIds.push(new URL(request.url).searchParams.get('ids'))
        return HttpResponse.json(
          [103, 101].map((id) => productSummaries.find((p) => p.productId === id)),
        )
      }),
    )
    renderAt('/me/likes?tab=products')

    expect(await screen.findByText(gyul)).toBeInTheDocument()
    expect(screen.getByText(apple)).toBeInTheDocument()
    expect(summaryIds).toEqual(['103,9999,101'])
    expect(
      screen.getByText(/판매자가 숨기거나 삭제한 상품 1개는 이 페이지에 보이지 않아요/),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /관심 상품\s*3/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `${apple} 관심 상품` })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('하트를 누르면 해제 요청을 보내고 목록을 다시 불러와 카드를 뺀다', async () => {
    let ids = [103, 101]
    const deleted: string[] = []
    server.use(
      http.get('*/api/v1/members/me/wishes', ({ request }) =>
        HttpResponse.json(pageOf(wishesOf(ids), new URL(request.url).searchParams)),
      ),
      http.delete('*/api/v1/members/me/wishes/:productId', ({ params }) => {
        deleted.push(String(params.productId))
        ids = ids.filter((id) => id !== Number(params.productId))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderAt('/me/likes?tab=products')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: `${apple} 관심 상품` }))
    expect(await screen.findByText('관심 상품에서 뺐어요')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(apple)).not.toBeInTheDocument())
    expect(deleted).toEqual(['101'])
    expect(screen.getByText(gyul)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /관심 상품\s*1/ })).toBeInTheDocument()
  })

  it('페이지를 옮기면 그 페이지의 찜을 부른다', async () => {
    const requested: string[] = []
    const ids = [...Array.from({ length: 20 }, (_, i) => 9000 + i), 103]
    server.use(
      http.get('*/api/v1/members/me/wishes', ({ request }) => {
        const params = new URL(request.url).searchParams
        requested.push(`${params.get('page')}/${params.get('size')}`)
        return HttpResponse.json(pageOf(wishesOf(ids), params))
      }),
    )
    renderAt('/me/likes?tab=products')
    const user = userEvent.setup()

    expect(
      await screen.findByText(/판매자가 숨기거나 삭제한 상품 20개는 이 페이지에 보이지 않아요/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '2페이지' }))
    expect(await screen.findByText(gyul)).toBeInTheDocument()
    expect(requested).toContain('1/20')
  })

  it('찜이 없으면 빈 화면을 보이고 상품 카드는 부르지 않는다', async () => {
    const summaries = vi.fn()
    server.use(
      wishList([]),
      http.get('*/api/v1/products/summaries', () => {
        summaries()
        return HttpResponse.json([])
      }),
    )
    renderAt('/me/likes?tab=products')
    expect(await screen.findByText('아직 관심 상품이 없어요')).toBeInTheDocument()
    expect(summaries).not.toHaveBeenCalled()
  })

  it('관리자는 찜 목록을 부르지 않고 쓸 수 없다고 안내한다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.ADMIN }))
    const wishes = vi.fn()
    server.use(
      http.get('*/api/v1/members/me/wishes', () => {
        wishes()
        return HttpResponse.json({})
      }),
    )
    renderAt('/me/likes?tab=products')
    expect(await screen.findByText('관리자 계정은 관심 상품을 쓸 수 없어요')).toBeInTheDocument()
    expect(wishes).not.toHaveBeenCalled()
  })

  it('팔로우 탭은 목록 대신 연결 전 안내를 보여 준다', async () => {
    renderAt('/me/likes?tab=farms')
    expect(await screen.findByText('팔로우한 농가는 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /팔로잉 취소/ })).not.toBeInTheDocument()
  })
})

describe('AccountPage', () => {
  it('탈퇴 탭은 폼 대신 연결 전 안내를 보여 준다', async () => {
    renderAt('/me/account?tab=withdraw')
    expect(await screen.findByText('회원 탈퇴는 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /탈퇴 신청/ })).not.toBeInTheDocument()
  })

  describe('비밀번호 탭', () => {
    const passwordProblem = (status: number, slug: string, detail: string, extra: object = {}) =>
      HttpResponse.json(
        {
          type: `https://api.example.com/problems/${slug}`,
          title: 'Error',
          status,
          detail,
          instance: '/api/v1/members/me/password',
          ...extra,
        },
        { status, headers: { 'Content-Type': 'application/problem+json' } },
      )

    beforeEach(() => setAccessToken(fakeToken({ role: MemberRole.BUYER }), 'refresh-1'))
    // 토스트는 전역 저장소(@mantine/notifications)라 다음 테스트의 role="alert" 조회에 남지 않게 비운다
    afterEach(() => notifications.clean())

    async function submitPassword(current = 'oldPass1!', next = 'newPass1!') {
      const user = userEvent.setup()
      renderAt('/me/account?tab=password')
      await user.type(await screen.findByLabelText('현재 비밀번호'), current)
      await user.type(screen.getByLabelText('새 비밀번호'), next)
      await user.type(screen.getByLabelText('새 비밀번호 확인'), next)
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))
      return user
    }

    it('바꾸면 PATCH로 보내고, 토큰을 모두 지운 뒤 로그인 화면으로 보내며 다시 로그인하라고 알린다', async () => {
      let body: unknown
      server.use(
        http.patch('*/api/v1/members/me/password', async ({ request }) => {
          body = await request.json()
          return new HttpResponse(null, { status: 204 })
        }),
      )
      await submitPassword(' oldPass1!', 'newPass1! ')

      expect(await screen.findByRole('heading', { name: '로그인 화면' })).toBeInTheDocument()
      expect(
        await screen.findByText('비밀번호를 바꿨어요. 새 비밀번호로 다시 로그인해 주세요'),
      ).toBeInTheDocument()
      // 공백도 비밀번호의 일부라 지우지 않고, 확인 칸은 보내지 않는다
      expect(body).toEqual({ currentPassword: ' oldPass1!', newPassword: 'newPass1! ' })
      expect(getAuthSession()).toBeNull()
      expect(getRefreshToken()).toBeNull()
    })

    it('현재 비밀번호가 틀리면(400) 그 칸에 알리고 focus하며 로그인은 유지한다', async () => {
      server.use(
        http.patch('*/api/v1/members/me/password', () =>
          passwordProblem(
            400,
            'member/invalid-current-password',
            '현재 비밀번호가 올바르지 않습니다.',
          ),
        ),
      )
      await submitPassword()

      expect(await screen.findByText('현재 비밀번호가 맞지 않아요')).toBeInTheDocument()
      const current = screen.getByLabelText('현재 비밀번호')
      expect(current).toHaveAccessibleDescription(
        expect.stringContaining('현재 비밀번호가 맞지 않아요'),
      )
      await waitFor(() => expect(current).toHaveFocus())
      expect(getAuthSession()).not.toBeNull()
      expect(screen.queryByRole('heading', { name: '로그인 화면' })).not.toBeInTheDocument()
    })

    it('새 비밀번호가 현재와 같다고 오면(400) 새 비밀번호 칸에 알린다', async () => {
      server.use(
        http.patch('*/api/v1/members/me/password', () =>
          passwordProblem(
            400,
            'member/same-as-current-password',
            '새 비밀번호가 현재 비밀번호와 같습니다.',
          ),
        ),
      )
      await submitPassword()
      expect(
        await screen.findByText('지금 비밀번호와 다른 비밀번호로 정해 주세요'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('새 비밀번호')).toHaveFocus()
    })

    it('서버 422는 errors[].path 칸에 서버 문구를 붙인다', async () => {
      server.use(
        http.patch('*/api/v1/members/me/password', () =>
          HttpResponse.json(
            {
              type: 'about:blank',
              title: 'Validation failed',
              status: 422,
              detail: '요청 값이 올바르지 않습니다.',
              instance: '/api/v1/members/me/password',
              errors: [
                {
                  path: 'newPassword',
                  detail: '비밀번호는 영문, 숫자, 특수문자를 모두 포함해 8~20자여야 합니다.',
                },
              ],
            },
            { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
          ),
        ),
      )
      await submitPassword()
      expect(
        await screen.findByText('비밀번호는 영문, 숫자, 특수문자를 모두 포함해 8~20자여야 합니다.'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('새 비밀번호')).toHaveFocus()
    })

    it('다른 요청이 먼저 바꿨으면(409) 다시 로그인한 뒤 시도하라고 알린다', async () => {
      server.use(
        http.patch('*/api/v1/members/me/password', () =>
          passwordProblem(
            409,
            'member/password-changed-concurrently',
            '비밀번호가 다른 요청으로 이미 변경되었습니다. 다시 로그인해 주세요.',
          ),
        ),
      )
      await submitPassword()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        '다른 곳에서 비밀번호가 먼저 바뀌었어요',
      )
    })

    it('규칙에 맞지 않거나 현재 비밀번호가 20자를 넘으면 보내지 않는다', async () => {
      let called = false
      server.use(
        http.patch('*/api/v1/members/me/password', () => {
          called = true
          return new HttpResponse(null, { status: 204 })
        }),
      )
      await submitPassword('a'.repeat(21), 'onlyletters')
      expect(
        await screen.findByText('현재 비밀번호는 20자 이하로 입력해 주세요'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('영문, 숫자, 특수문자를 모두 포함해 8~20자로 입력해 주세요'),
      ).toBeInTheDocument()
      expect(called).toBe(false)
    })
  })

  it('내 정보 탭은 서버 값을 채우고 아이디·이메일은 읽기 전용이다', async () => {
    renderAt('/me/account?tab=info')
    expect(await screen.findByLabelText('이름')).toHaveValue('김철수')
    expect(screen.getByLabelText('닉네임')).toHaveValue('풀떼기먹자')
    expect(screen.getByLabelText('아이디')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('이메일')).toHaveAttribute('readonly')
  })

  it('저장하면 앞뒤 공백을 지운 이름·닉네임을 둘 다 PUT으로 보낸다', async () => {
    let body: unknown
    server.use(
      http.put('*/api/v1/members/me', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({
          loginId: 'tester01',
          email: 'tester01@example.com',
          name: '박영희',
          nickname: '햇살농부',
        })
      }),
    )
    const user = userEvent.setup()
    renderAt('/me/account?tab=info')
    const name = await screen.findByLabelText('이름')
    await user.clear(name)
    await user.type(name, '  박영희 ')
    const nickname = screen.getByLabelText('닉네임')
    await user.clear(nickname)
    await user.type(nickname, '햇살농부')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('내 정보를 저장했어요')).toBeInTheDocument()
    expect(body).toEqual({ name: '박영희', nickname: '햇살농부' })
  })

  it('닉네임이 한 글자면 보내지 않고 칸에 안내한다', async () => {
    let called = false
    server.use(
      http.put('*/api/v1/members/me', () => {
        called = true
        return HttpResponse.json({})
      }),
    )
    const user = userEvent.setup()
    renderAt('/me/account?tab=info')
    const nickname = await screen.findByLabelText('닉네임')
    await user.clear(nickname)
    await user.type(nickname, '가')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByText('닉네임은 2~30자로 입력해 주세요')).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('서버 422는 errors[].path 칸에 서버 문구를 붙이고 그 칸으로 focus한다', async () => {
    server.use(
      http.put('*/api/v1/members/me', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Unprocessable',
            status: 422,
            detail: '요청 값이 올바르지 않습니다.',
            instance: '/api/v1/members/me',
            errors: [{ path: 'nickname', detail: '닉네임에 쓸 수 없는 글자가 있어요' }],
          },
          { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    const user = userEvent.setup()
    renderAt('/me/account?tab=info')
    await screen.findByLabelText('이름')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByText('닉네임에 쓸 수 없는 글자가 있어요')).toBeInTheDocument()
    expect(screen.getByLabelText('닉네임')).toHaveFocus()
  })

  it('탈퇴한 회원(404)이면 폼 위에 안내를 보인다', async () => {
    server.use(
      http.put('*/api/v1/members/me', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Not Found', status: 404, detail: 'x', instance: '/x' },
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    const user = userEvent.setup()
    renderAt('/me/account?tab=info')
    await screen.findByLabelText('이름')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('내 정보를 찾을 수 없어요')
  })

  describe('배송지 탭', () => {
    beforeEach(() => setAccessToken(fakeToken({ role: MemberRole.BUYER })))

    it('서버 기본 배송지를 연락처에 하이픈을 붙여 보여 주고 삭제는 막는다', async () => {
      server.use(registered)
      renderAt('/me/account?tab=address')
      const card = await screen.findByLabelText('저장된 배송지')
      expect(card).toHaveTextContent('이서연 · 010-2468-1357')
      expect(card).toHaveTextContent('(04524) 서울 중구 세종대로 110, 3층 301호')
      expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled()
    })

    it('미등록(204)이면 등록 안내를 보이고, 등록하면 PUT 본문(우편번호·요청사항)으로 보낸다', async () => {
      let body: unknown
      server.use(
        http.put('*/api/v1/shipments/addresses/default', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            ...(body as object),
            recipientPhone: '01012345678',
            deliveryNote: null,
          })
        }),
      )
      const user = userEvent.setup()
      renderAt('/me/account?tab=address')
      expect(await screen.findByText('저장된 배송지가 없어요')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '배송지 등록' }))
      await user.type(await screen.findByLabelText('받는 분'), '홍길동')
      await user.type(screen.getByLabelText('연락처'), '010-1234-5678')
      await user.click(screen.getByRole('button', { name: '우편번호 찾기' }))
      await user.type(screen.getByLabelText('상세주소'), '101동 202호')
      await user.click(screen.getByRole('button', { name: '저장' }))

      expect(await screen.findByLabelText('저장된 배송지')).toHaveTextContent('(63000)')
      expect(body).toEqual({
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        postalCode: '63000',
        address: '제주특별자치도 제주시 첨단로 242',
        addressDetail: '101동 202호',
      })
    })

    it('수정할 때 화면에 없는 배송 요청사항은 서버에 있던 값을 그대로 보낸다', async () => {
      let body: unknown
      server.use(
        registered,
        http.put('*/api/v1/shipments/addresses/default', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(sampleDefaultAddress)
        }),
      )
      const user = userEvent.setup()
      renderAt('/me/account?tab=address')
      await user.click(await screen.findByRole('button', { name: '수정' }))
      await user.click(await screen.findByRole('button', { name: '저장' }))
      await waitFor(() => expect(body).toBeDefined())
      expect(body).toMatchObject({
        recipientName: '이서연',
        recipientPhone: '010-2468-1357',
        postalCode: '04524',
        deliveryNote: '문 앞에 놓아 주세요',
      })
    })

    it('서버 422는 postalCode 같은 path를 화면 칸에 붙이고 모달을 열어 둔다', async () => {
      server.use(
        registered,
        http.put('*/api/v1/shipments/addresses/default', () =>
          HttpResponse.json(
            {
              type: 'about:blank',
              title: 'Unprocessable',
              status: 422,
              detail: '요청 값이 올바르지 않습니다.',
              instance: '/x',
              errors: [{ path: 'recipientPhone', detail: '연락처는 숫자 9~11자리여야 합니다.' }],
            },
            { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
          ),
        ),
      )
      const user = userEvent.setup()
      renderAt('/me/account?tab=address')
      await user.click(await screen.findByRole('button', { name: '수정' }))
      await user.click(await screen.findByRole('button', { name: '저장' }))
      expect(await screen.findByText('연락처는 숫자 9~11자리여야 합니다.')).toBeInTheDocument()
      expect(screen.getByLabelText('연락처')).toHaveFocus()
    })

    it('관리자 토큰이면 부르지 않고 구매자 전용이라고 안내한다', async () => {
      setAccessToken(fakeToken({ role: MemberRole.ADMIN }))
      renderAt('/me/account?tab=address')
      expect(
        await screen.findByText('기본 배송지는 구매자 계정에서만 쓸 수 있어요'),
      ).toBeInTheDocument()
    })
  })
})
