import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'
import { connectRedis, RedisSessionStore } from './session/redis.ts'

const config = loadConfig()
const redis = config.redis && (await connectRedis(config.redis.url))
const store =
  config.redis && redis ? new RedisSessionStore(redis, config.redis.encryptionKey) : undefined
const server = serve({ fetch: createApp({ config, store }).fetch, port: config.port }, (info) => {
  console.log(
    `BFF listening on :${info.port} → ${config.backendUrl} (세션: ${redis ? 'Redis' : '메모리'})`,
  )
})

// docker stop은 SIGTERM을 보낸다. 받던 요청을 마치고 끝낸다
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () =>
    server.close(async () => {
      await redis?.close()
      process.exit(0)
    }),
  )
}
