import { act, renderHook, waitFor } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { server } from '@/mocks/server'
import { MediaPurpose } from '@/shared/api/types'
import { useMediaUploads } from './useMediaUploads'

const file = (name: string, type = 'image/jpeg') => new File(['x'], name, { type })
const S3 = 'https://bucket.s3.ap-northeast-2.amazonaws.com/product_review'

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

describe('useMediaUploads', () => {
  it('고른 파일을 purpose로 올리고, 다 올리면 서버 url로 바꾼다', async () => {
    let purpose: string | readonly string[] | undefined
    let contentType: string | null = null
    server.use(
      http.post('*/api/v1/media/:purpose', async ({ request, params }) => {
        purpose = params.purpose
        contentType = request.headers.get('Content-Type')
        await delay(10)
        return HttpResponse.json({ mediaId: 1, url: `${S3}/a.jpg` }, { status: 201 })
      }),
    )
    const { result } = renderHook(() => useMediaUploads(MediaPurpose.PRODUCT_REVIEW))

    act(() => result.current.add([file('a.jpg')]))
    expect(result.current.uploading).toBe(true)
    expect(result.current.urls).toEqual([])

    await waitFor(() => expect(result.current.uploading).toBe(false))
    expect(purpose).toBe('PRODUCT_REVIEW')
    expect(contentType).toMatch(/^multipart\/form-data/)
    expect(result.current.items).toEqual([
      expect.objectContaining({ url: `${S3}/a.jpg`, kind: 'image', progress: undefined }),
    ])
    expect(result.current.urls).toEqual([`${S3}/a.jpg`])
  })

  it('실패한 파일은 빼고 서버 detail을 오류로 준다', async () => {
    server.use(
      http.post('*/api/v1/media/:purpose', () =>
        HttpResponse.json(
          { status: 400, title: 'Bad Request', detail: '해당 파일은 지원하지 않는 형식입니다.' },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    const { result } = renderHook(() =>
      useMediaUploads(MediaPurpose.PRODUCT, [{ url: `${S3}/saved.jpg` }]),
    )

    act(() => result.current.add([file('b.gif', 'image/gif')]))
    await waitFor(() => expect(result.current.error).toBe('해당 파일은 지원하지 않는 형식입니다.'))
    expect(result.current.urls).toEqual([`${S3}/saved.jpg`])
    expect(result.current.uploading).toBe(false)
  })

  it('올리는 중에 지우면 목록에서 빠지고 오류를 내지 않는다', async () => {
    server.use(
      http.post('*/api/v1/media/:purpose', async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )
    const { result } = renderHook(() => useMediaUploads(MediaPurpose.PRODUCT))

    act(() => result.current.add([file('c.jpg')]))
    const id = result.current.items[0]?.id ?? ''
    act(() => result.current.remove(id))

    expect(result.current.items).toEqual([])
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled())
    expect(result.current.error).toBeNull()
  })
})
