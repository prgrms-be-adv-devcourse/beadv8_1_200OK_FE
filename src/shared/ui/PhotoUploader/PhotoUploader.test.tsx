import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { PhotoUploader } from './PhotoUploader'
import { validatePhotos } from './validatePhotos'

function photo(name: string, sizeMb: number, type = 'image/jpeg') {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: sizeMb * 1024 * 1024 })
  return file
}

const rules = { remaining: 3, max: 3, maxSizeMb: 10, accept: ['image/jpeg', 'image/png'] }

describe('validatePhotos', () => {
  it('10MB 이하만 받는다', () => {
    const result = validatePhotos([photo('a.jpg', 3), photo('b.jpg', 11)], rules)
    expect(result.accepted.map((f) => f.name)).toEqual(['a.jpg'])
    expect(result.error).toBe('사진은 10MB 이하로 올려 주세요')
  })

  it('남은 자리만큼만 받는다', () => {
    const result = validatePhotos([photo('a.jpg', 1), photo('b.jpg', 1)], {
      ...rules,
      remaining: 1,
    })
    expect(result.accepted).toHaveLength(1)
    expect(result.error).toBe('사진은 최대 3장까지 올릴 수 있어요')
  })

  it('사진이 아닌 파일은 뺀다', () => {
    const result = validatePhotos([photo('a.pdf', 1, 'application/pdf')], rules)
    expect(result.accepted).toHaveLength(0)
    expect(result.error).not.toBeNull()
  })

  describe('영상 (리뷰: 6개 중 영상 1개 · 30MB)', () => {
    const withVideo = {
      ...rules,
      remaining: 6,
      max: 6,
      video: { maxCount: 1, maxSizeMb: 30, current: 0 },
    }

    it('mp4 영상은 30MB까지 받는다', () => {
      const result = validatePhotos([photo('a.mp4', 25, 'video/mp4')], withVideo)
      expect(result.accepted).toHaveLength(1)
      expect(result.error).toBeNull()
    })

    it('30MB를 넘는 영상은 뺀다', () => {
      const result = validatePhotos([photo('a.mp4', 31, 'video/mp4')], withVideo)
      expect(result.accepted).toHaveLength(0)
      expect(result.error).toBe('영상은 30MB 이하로 올려 주세요')
    })

    it('영상은 1개까지만 받는다', () => {
      const result = validatePhotos([photo('a.mp4', 5, 'video/mp4'), photo('b.jpg', 1)], {
        ...withVideo,
        video: { ...withVideo.video, current: 1 },
      })
      expect(result.accepted.map((f) => f.name)).toEqual(['b.jpg'])
      expect(result.error).toBe('영상은 1개까지 올릴 수 있어요')
    })

    it('영상을 받지 않으면 mp4는 형식 오류', () => {
      const result = validatePhotos([photo('a.mp4', 5, 'video/mp4')], rules)
      expect(result.error).toBe('jpg·png·webp 사진만 올릴 수 있어요')
    })
  })
})

describe('PhotoUploader', () => {
  it('고른 사진을 넘기고, 10MB를 넘으면 오류를 알린다', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const onAdd = vi.fn()
    render(<PhotoUploader label="사진" items={[]} max={3} onAdd={onAdd} onRemove={() => {}} />)

    await user.upload(screen.getByLabelText('사진 파일 고르기'), [
      photo('a.jpg', 2),
      photo('b.jpg', 12),
    ])

    expect(onAdd).toHaveBeenCalledWith([expect.objectContaining({ name: 'a.jpg' })])
    expect(screen.getByRole('alert')).toHaveTextContent('사진은 10MB 이하로 올려 주세요')
  })

  it('가득 차면 추가 칸을 숨긴다', () => {
    render(
      <PhotoUploader
        label="사진"
        items={[1, 2, 3].map((n) => ({ id: String(n), url: '' }))}
        max={3}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /사진 추가/ })).not.toBeInTheDocument()
  })

  it('순서 바꾸기: 첫 사진은 앞으로, 마지막 사진은 뒤로 갈 수 없다', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn()
    render(
      <PhotoUploader
        label="상품 사진"
        items={[1, 2].map((n) => ({ id: String(n), url: '' }))}
        max={8}
        onAdd={() => {}}
        onRemove={() => {}}
        onMove={onMove}
      />,
    )
    expect(screen.getByRole('button', { name: '상품 사진 1 앞으로' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '상품 사진 2 뒤로' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '상품 사진 1 뒤로' }))
    expect(onMove).toHaveBeenCalledWith('1', 1)
  })
})
