import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 진입점. providers → router → layouts 조립은 docs/architecture/frontend.md 참고.
// 기능 코드는 아직 없으며 빌드·설정 검증용 최소 셸이다.

const container = document.getElementById('root')
if (!container) {
  throw new Error('#root element not found')
}

createRoot(container).render(
  <StrictMode>
    <main>농가 직거래 마켓 — 프로젝트 골격</main>
  </StrictMode>,
)
