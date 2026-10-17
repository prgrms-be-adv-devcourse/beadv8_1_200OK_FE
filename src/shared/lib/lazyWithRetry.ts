// 지연 로딩 청크를 못 받으면 한 번만 새로고침한다 (아키텍처 FE-Q-005).
// 배포 뒤 열려 있던 옛 탭은 사라진 청크 이름을 요청한다 → 새로고침하면 새 index.html의 청크를 받는다.
// 새로고침한 뒤에도 실패하면 오류를 그대로 던져 라우트 ErrorBoundary가 오류 화면을 보여 준다.

const RELOAD_FLAG = 'pd:chunk-reload'

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>

export function lazyWithRetry<T>(
  importer: () => Promise<T>,
  {
    storage = sessionStorage,
    reload = () => window.location.reload(),
  }: { storage?: Storage; reload?: () => void } = {},
): () => Promise<T> {
  return async () => {
    try {
      const module = await importer()
      storage.removeItem(RELOAD_FLAG)
      return module
    } catch (error) {
      if (storage.getItem(RELOAD_FLAG)) {
        storage.removeItem(RELOAD_FLAG)
        throw error
      }
      storage.setItem(RELOAD_FLAG, '1')
      reload()
      // 새로고침되는 동안 화면이 오류로 바뀌지 않게 끝나지 않는 약속을 돌려준다
      return new Promise<T>(() => {})
    }
  }
}
