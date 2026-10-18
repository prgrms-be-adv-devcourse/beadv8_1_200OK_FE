import '@testing-library/jest-dom/vitest'

// jsdom에 없는 브라우저 API. Mantine이 쓴다 (https://mantine.dev/guides/vitest/)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub

window.HTMLElement.prototype.scrollIntoView = () => {}

// Textarea autosize(react-textarea-autosize)가 글꼴 로딩 이벤트를 듣는다. jsdom에는 document.fonts가 없다.
if (!('fonts' in document)) {
  Object.defineProperty(document, 'fonts', {
    value: { addEventListener: () => {}, removeEventListener: () => {}, ready: Promise.resolve() },
  })
}
