/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    // 브라우저 → vite → BFF(bff/) → 백엔드. 백엔드 주소는 BFF가 env(BACKEND_URL)로 정한다 (ADR-0006).
    // VITE_API_BASE_URL을 비워 두면 브라우저는 같은 오리진으로 보내고 여기서 BFF로 넘긴다
    proxy: Object.fromEntries(
      ['/api', '/bff'].map((path) => [
        path,
        {
          target: loadEnv(mode, process.cwd(), '').VITE_BFF_PROXY_TARGET || 'http://localhost:8787',
          changeOrigin: true,
        },
      ]),
    ),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    modules: {
      // CSS Modules 클래스명: 개발 시 가독성, 프로덕션은 짧은 해시
      localsConvention: 'camelCaseOnly',
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // ADR-0001: 무거운 공통 라이브러리를 vendor 청크로 분리 (Vite 8 / rolldown codeSplitting)
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
            },
            { name: 'mantine', test: /node_modules[\\/]@mantine[\\/]/ },
            { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}))
