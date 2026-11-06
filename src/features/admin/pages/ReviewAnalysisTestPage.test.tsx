import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '@/app/routes'
import { problem } from '@/mocks/handlers/_shared'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import {
  analysisApple,
  analysisProductDetails,
  analysisProductSummaries,
  keywordNotAnalyzed,
  sentimentNotAnalyzed,
} from '../fixtures'
import type { ReviewAnalysisRequest } from '../types'
import { AdminReviewAnalysisTestPage } from './AdminPages'

const keywordsUrl = '*/api/v1/admin/review-analysis/keywords'
const sentimentUrl = '*/api/v1/admin/review-analysis/sentiment'

function serveAnalysisProducts() {
  server.use(
    http.get('*/api/v1/products', () =>
      HttpResponse.json({
        content: analysisProductSummaries,
        page: 0,
        size: 100,
        totalElements: analysisProductSummaries.length,
        totalPages: 1,
      }),
    ),
    http.get('*/api/v1/products/:productId', ({ params }) => {
      const detail = analysisProductDetails.find((d) => d.productId === Number(params.productId))
      return detail ? HttpResponse.json(detail) : problem(404, '상품을 찾을 수 없습니다.')
    }),
  )
}

function renderPage() {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <AdminReviewAnalysisTestPage />
    </MemoryRouter>,
  )
  return user
}

async function fillAndAnalyze(user: ReturnType<typeof userEvent.setup>, content = '달고 아삭해요') {
  await user.click(await screen.findByRole('combobox', { name: '상품' }))
  await user.click(await screen.findByRole('option', { name: analysisApple.name }))
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: '옵션' })).toHaveValue(
      analysisApple.options[0]?.name,
    ),
  )
  await user.type(screen.getByRole('textbox', { name: '리뷰 본문' }), content)
  await user.click(screen.getByRole('button', { name: '분석' }))
}

const keywordPanel = () => screen.getByRole('region', { name: '키워드 분석 결과' })
const sentimentPanel = () => screen.getByRole('region', { name: '감성 분석 결과' })

beforeEach(() => {
  setAccessToken(fakeToken({ memberId: 1, role: MemberRole.ADMIN }))
  serveAnalysisProducts()
})
afterEach(() => clearAccessToken())

describe('AdminReviewAnalysisTestPage', () => {
  it('관리자가 아니면 들어오지 못한다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    const router = createMemoryRouter([{ path: '/', children: appRoutes }], {
      initialEntries: ['/admin/review-analysis-test'],
    })
    render(<RouterProvider router={router} />)
    expect(await screen.findByText('관리자만 볼 수 있는 화면이에요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '분석' })).not.toBeInTheDocument()
  })

  it('상품을 고르면 첫 옵션이 골라지고, 그 옵션 번호로 분석을 요청한다', async () => {
    const bodies: ReviewAnalysisRequest[] = []
    server.use(
      http.post(keywordsUrl, async ({ request }) => {
        bodies.push((await request.json()) as ReviewAnalysisRequest)
        return HttpResponse.json(keywordNotAnalyzed)
      }),
    )
    const user = renderPage()
    expect(screen.getByRole('button', { name: '분석' })).toBeDisabled()
    expect(screen.getByText('상품을 골라 주세요')).toBeInTheDocument()

    await fillAndAnalyze(user)

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({
      productId: analysisApple.productId,
      optionId: analysisApple.options[0]?.optionId,
      content: '달고 아삭해요',
    })
  })

  it('두 분석을 한꺼번에 요청한다', async () => {
    // 각 핸들러가 다른 쪽 요청이 올 때까지 응답을 미룬다 → 차례로 부르면 끝나지 않는다
    let keywordArrived: () => void = () => {}
    let sentimentArrived: () => void = () => {}
    const keywordGate = new Promise<void>((resolve) => {
      keywordArrived = resolve
    })
    const sentimentGate = new Promise<void>((resolve) => {
      sentimentArrived = resolve
    })
    server.use(
      http.post(keywordsUrl, async () => {
        keywordArrived()
        await sentimentGate
        return HttpResponse.json(keywordNotAnalyzed)
      }),
      http.post(sentimentUrl, async () => {
        sentimentArrived()
        await keywordGate
        return HttpResponse.json(sentimentNotAnalyzed)
      }),
    )
    const user = renderPage()
    await fillAndAnalyze(user)

    expect(
      await within(keywordPanel()).findByText('내용 없는 리뷰라 분석하지 않았어요'),
    ).toBeInTheDocument()
    expect(
      await within(sentimentPanel()).findByText('내용 없는 리뷰라 분석하지 않았어요'),
    ).toBeInTheDocument()
  })

  it('키워드 분석이 실패해도 감성 결과는 보인다', async () => {
    server.use(http.post(keywordsUrl, () => problem(502, '키워드 분석기 응답을 받지 못했습니다.')))
    const user = renderPage()
    await fillAndAnalyze(user)

    expect(await within(keywordPanel()).findByRole('alert')).toHaveTextContent(
      '키워드 분석기 응답을 받지 못했습니다.',
    )
    const sentiment = sentimentPanel()
    expect(await within(sentiment).findByText('분류 기준 버전')).toBeInTheDocument()
    expect(within(sentiment).getByText('전체').closest('div')).toHaveTextContent('혼합')
    expect(within(sentiment).getByText('배송').closest('div')).toHaveTextContent('부정')
  })

  it('감성 분석이 실패해도 키워드 결과는 보인다', async () => {
    server.use(http.post(sentimentUrl, () => problem(503, '분석기 인증이 거절되었습니다.')))
    const user = renderPage()
    await fillAndAnalyze(user)

    expect(await within(sentimentPanel()).findByRole('alert')).toHaveTextContent(
      '분석기 인증이 거절되었습니다.',
    )
    expect(await within(keywordPanel()).findByText('달아요')).toBeInTheDocument()
  })

  it('분석하지 않은 리뷰는 두 패널에 그 사실을 알린다', async () => {
    server.use(
      http.post(keywordsUrl, () => HttpResponse.json(keywordNotAnalyzed)),
      http.post(sentimentUrl, () => HttpResponse.json(sentimentNotAnalyzed)),
    )
    const user = renderPage()
    await fillAndAnalyze(user, '!!!')

    expect(
      await within(keywordPanel()).findByText('내용 없는 리뷰라 분석하지 않았어요'),
    ).toBeInTheDocument()
    expect(
      await within(sentimentPanel()).findByText('내용 없는 리뷰라 분석하지 않았어요'),
    ).toBeInTheDocument()
  })

  it('키워드는 확률 높은 순이고, 표현한 키워드와 식감 규칙으로 빠진 키워드를 글로 구분한다', async () => {
    const user = renderPage()
    await fillAndAnalyze(user)

    const list = await within(keywordPanel()).findByRole('list', { name: '키워드 확률 높은 순' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows.map((row) => row.firstElementChild?.textContent)).toEqual([
      '달아요',
      '아삭해요',
      '포장이 꼼꼼해요',
      '배송이 빨라요',
    ])
    expect(rows[0]).toHaveTextContent('97%')
    expect(rows[0]).toHaveTextContent('표현한 키워드')
    expect(rows[1]).toHaveTextContent('식감 규칙으로 제외')
    expect(rows[1]).not.toHaveTextContent('표현한 키워드')
    expect(within(keywordPanel()).getByText('0.3')).toBeInTheDocument()
  })

  it('서버에 아직 없는 경로면 원문 대신 안내 문구를 보인다', async () => {
    server.use(http.post(keywordsUrl, () => problem(404, 'No static resource api/v1/admin.')))
    const user = renderPage()
    await fillAndAnalyze(user)

    const alert = await within(keywordPanel()).findByRole('alert')
    expect(alert).toHaveTextContent('지금은 이 기능을 쓸 수 없어요')
    expect(alert).not.toHaveTextContent('No static resource')
  })
})
