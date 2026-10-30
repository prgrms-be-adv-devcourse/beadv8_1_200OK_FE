import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
const server = serve({ fetch: createApp({ config }).fetch, port: config.port }, (info) => {
  console.log(`BFF listening on :${info.port} → ${config.backendUrl}`)
})

// docker stop은 SIGTERM을 보낸다. 받던 요청을 마치고 끝낸다
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
