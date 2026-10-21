#!/bin/sh
# 시연 실행: ./demo/demo.sh [--from N] [--auto] [--record]
# 화면 크기·쉬는 시간은 아래 기본값을 쓰고, 실행할 때 환경 변수로 덮을 수 있다.
cd "$(dirname "$0")" || exit 1
export DEMO_SCREEN_W="${DEMO_SCREEN_W:-1728}"
export DEMO_SCREEN_H="${DEMO_SCREEN_H:-1080}"
exec node run.mjs "$@"
