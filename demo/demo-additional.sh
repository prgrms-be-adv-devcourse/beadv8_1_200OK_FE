#!/bin/sh
# 추가 장면 실행: ./demo-additional.sh [--from N] [--auto] [--record]
# 본 시연(demo.sh)이 남긴 state.json의 계정·상품·주문을 이어 쓴다.
cd "$(dirname "$0")" || exit 1
export DEMO_SCREEN_W="${DEMO_SCREEN_W:-1728}"
export DEMO_SCREEN_H="${DEMO_SCREEN_H:-1080}"
exec node run.mjs --set additional "$@"
