import { wrapCreateBrowserRouter } from '@sentry/react'
import { createBrowserRouter } from 'react-router'
import { routes } from './routes'

// React Router 8 data mode. 라우트 표는 routes.tsx
// Sentry가 감싸서 pageload·navigation 트레이스 이름을 라우트 패턴(/products/:productId)으로 남긴다.
// instrument.ts의 init 뒤에 불려야 한다(main.tsx가 instrument를 먼저 읽음)
export const router = wrapCreateBrowserRouter(createBrowserRouter)(routes)
