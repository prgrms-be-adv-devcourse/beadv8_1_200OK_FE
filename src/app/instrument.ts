import * as Sentry from '@sentry/react'
import { useEffect } from 'react'
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router'

// router.tsx가 createBrowserRouter를 감싸기 전에 init해야 해서 main.tsx가 맨 먼저 읽는다.
// VITE_SENTRY_DSN이 없으면(테스트·DSN 없는 개발) 아무것도 보내지 않는다.
// 트레이스 헤더는 기본값대로 같은 오리진(/api·/bff → BFF)에만 붙는다. 다른 오리진의 API로 보낼 때
// tracePropagationTargets를 넓히려면 그 서버의 CORS가 sentry-trace·baggage 헤더를 받아야 한다.
const dsn = import.meta.env.VITE_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
  integrations: [
    Sentry.reactRouterBrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
  ],
  // 로그는 v11부터 기본으로 켜져 있다(Sentry.logger). console.warn·error도 로그로 보낸다
  // 개발은 모든 트레이스를 본다. 운영 빌드는 10%부터 시작한다
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
})
