#!/usr/bin/env bash
# BFF 이미지를 받아 다시 띄우고 healthy가 될 때까지 기다려요. 절차는 deploy/README.md
# 이후 자동 배포도 이 스크립트를 그대로 실행해요
set -euo pipefail
cd "$(dirname "$0")"

# 로컬 검증에서는 COMPOSE_FILE로 override 파일을 덧붙여요
export COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yml}"

HEALTH_RETRIES=24 # 5초 × 24 = 최대 2분
HEALTH_INTERVAL=5
ROLLBACK_HINT="롤백: .env의 BFF_IMAGE_TAG=<이전 SHA 7자리>로 바꾼 뒤 다시 ./deploy.sh"

exec 9>/tmp/paldo-bff-deploy.lock
flock -n 9 || { echo "이미 배포 중이에요" >&2; exit 1; }

if ! docker network inspect paldo-edge >/dev/null 2>&1; then
  echo "배포 중단: paldo-edge 네트워크가 없어요. 백엔드(nginx·네트워크 변경)를 먼저 배포해요" >&2
  exit 1
fi

IMAGE=$(docker compose config --images bff)
docker compose pull bff

# 헬스체크가 없는 이미지는 아래 대기가 healthy를 판정할 수 없어요. 컨테이너를 바꾸기 전에 멈춰요
HEALTHCHECK=$(docker image inspect -f '{{with .Config.Healthcheck}}{{json .Test}}{{end}}' "$IMAGE")
if [ -z "$HEALTHCHECK" ] || [ "$HEALTHCHECK" = '["NONE"]' ]; then
  echo "배포 중단: $IMAGE 에 HEALTHCHECK가 없어요. 실행 중인 컨테이너는 그대로예요" >&2
  exit 1
fi

if ! docker compose up -d bff; then
  echo "배포 실패: bff 기동 중 오류가 났어요" >&2
  docker compose logs --tail 100 bff >&2
  echo "$ROLLBACK_HINT" >&2
  exit 1
fi

CID=$(docker compose ps -q bff)
[ -n "$CID" ] || { echo "bff 컨테이너를 찾지 못했어요" >&2; exit 1; }

STATUS=unknown
for _ in $(seq 1 "$HEALTH_RETRIES"); do
  STATUS=$(docker inspect -f '{{.State.Health.Status}}' "$CID" 2>/dev/null || echo unknown)
  if [ "$STATUS" = healthy ]; then
    REVISION=$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$IMAGE")
    echo "배포 성공: $IMAGE${REVISION:+ (revision $REVISION)}"
    exit 0
  fi
  sleep "$HEALTH_INTERVAL"
done

echo "배포 실패: 2분 안에 healthy가 되지 않았어요 (마지막 상태: $STATUS)" >&2
docker compose logs --tail 100 bff >&2
echo "$ROLLBACK_HINT" >&2
exit 1
