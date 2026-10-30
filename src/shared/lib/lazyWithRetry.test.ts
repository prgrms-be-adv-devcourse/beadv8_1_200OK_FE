import { lazyWithRetry } from './lazyWithRetry'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    size: () => map.size,
  }
}

describe('lazyWithRetry', () => {
  it('성공하면 모듈을 돌려주고 표시를 지운다', async () => {
    const storage = memoryStorage()
    storage.setItem('pd:chunk-reload', '1')
    const load = lazyWithRetry(async () => 'module', { storage, reload: vi.fn() })
    await expect(load()).resolves.toBe('module')
    expect(storage.size()).toBe(0)
  })

  it('처음 실패하면 한 번 새로고침한다', async () => {
    const storage = memoryStorage()
    const reload = vi.fn()
    const load = lazyWithRetry(() => Promise.reject(new Error('chunk')), { storage, reload })
    void load()
    await Promise.resolve()
    await Promise.resolve()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(storage.getItem('pd:chunk-reload')).toBe('1')
  })

  it('새로고침 뒤에도 실패하면 오류를 던진다', async () => {
    const storage = memoryStorage()
    storage.setItem('pd:chunk-reload', '1')
    const reload = vi.fn()
    const load = lazyWithRetry(() => Promise.reject(new Error('chunk')), { storage, reload })
    await expect(load()).rejects.toThrow('chunk')
    expect(reload).not.toHaveBeenCalled()
    expect(storage.size()).toBe(0)
  })
})
