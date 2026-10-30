# 빌드 컨텍스트는 저장소 루트다(workspace lockfile이 루트에 있다):
#   docker build -f bff/Dockerfile -t paldo-bff .
# Node 24가 .ts를 그대로 실행하므로 컴파일 단계가 없다
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY bff/package.json bff/
RUN pnpm install --frozen-lockfile --filter @paldo/bff
COPY bff bff
# BFF와 운영 의존성만 /out에 모은다. 테스트 코드는 이미지에 넣지 않는다
RUN pnpm --filter @paldo/bff deploy --prod /out \
  && rm -rf /out/src/test /out/vitest.config.ts \
  && find /out/src -name '*.test.ts' -delete

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out .
USER node
EXPOSE 8787
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8787/health | grep -q UP || exit 1
CMD ["node", "src/main.ts"]
