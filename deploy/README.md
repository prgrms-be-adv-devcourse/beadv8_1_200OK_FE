# BFF 운영 배포

BFF는 백엔드와 같은 EC2에서 돌지만, 프론트가 맡는 별도 compose 프로젝트(`paldo-gotgan-bff`, `/opt/paldo-gotgan-bff`)예요. 결정 근거는 ADR-0010이에요.

- 이미지는 `main`에 `bff/`가 바뀌면 `.github/workflows/bff-image.yml`이 GHCR `paldo-gotgan-bff`에 `latest`와 커밋 SHA 7자리로 올려요.
- 서버는 GHCR에서 이미지를 받아요. 배포는 손으로 해요(`scp` 후 `./deploy.sh`). 나중에 자동 배포도 같은 스크립트를 불러요.
- BFF는 호스트 포트를 열지 않아요. 백엔드 nginx가 `/api/v1/`과 `/bff/`를 모두 `paldo-edge` 네트워크의 `bff:8787`로 보내고, BFF는 같은 네트워크에서 `app:8080`으로 백엔드를 불러요.
- 그래서 BFF가 죽으면 API 전체가 502예요. 서비스 운영 전이라 nginx에 앱 직결로 돌리는 스위치는 두지 않았어요(ADR-0010). 이상하면 아래 '롤백'으로 이미지를 되돌려요.

## 먼저 있어야 하는 것

- 백엔드 쪽 nginx 경로와 `paldo-edge` 네트워크가 배포돼 있어야 해요. 네트워크가 없으면 `deploy.sh`가 아무것도 바꾸지 않고 멈춰요.
- 서버의 GHCR pull 토큰이 `paldo-gotgan-bff` 패키지를 읽을 수 있어야 해요. 백엔드용 토큰(`read:packages`)을 같이 써도 되지만, 패키지가 비공개면 그 계정이 이 패키지에 접근할 수 있는지 확인해요.

## 처음 설정 (서버당 1회)

```bash
# 로컬
scp -i <키 파일> deploy/compose.prod.yml deploy/deploy.sh deploy/.env.prod.example ubuntu@<EIP>:/tmp/

# 서버
sudo mkdir -p /opt/paldo-gotgan-bff && sudo chown ubuntu:ubuntu /opt/paldo-gotgan-bff
mv /tmp/compose.prod.yml /tmp/deploy.sh /tmp/.env.prod.example /opt/paldo-gotgan-bff/
cd /opt/paldo-gotgan-bff
chmod +x deploy.sh
cp .env.prod.example .env && chmod 600 .env
docker login ghcr.io -u <GitHub 사용자>   # 백엔드 설정 때 이미 로그인했다면 건너뛰어요
./deploy.sh
```

## 배포

Actions 탭에서 `BFF Image` 실행이 성공했는지 본 뒤 서버에서 실행해요.

```bash
cd /opt/paldo-gotgan-bff && ./deploy.sh
```

스크립트는 이미지를 받고, 이미지에 HEALTHCHECK가 있는지 본 다음 컨테이너를 바꿔요. 2분 안에 healthy가 되면 `배포 성공: <이미지> (revision <커밋>)`을 출력해요. 실패하면 bff 로그 100줄과 롤백 방법을 출력해요. 여러 번 실행해도 결과는 같아요.

`deploy/compose.prod.yml`이나 `deploy.sh`가 바뀌었으면 그 파일을 먼저 `scp`로 `/opt/paldo-gotgan-bff/`에 덮어써요. 이 파일들만 바뀐 push는 이미지를 새로 빌드하지 않아요.

## 롤백

```bash
cd /opt/paldo-gotgan-bff
sed -i 's/^BFF_IMAGE_TAG=.*/BFF_IMAGE_TAG=<이전 SHA 7자리>/' .env
./deploy.sh
```

연달아 push하면 중간 커밋의 SHA 태그는 없을 수 있어요. GHCR 패키지 화면에서 실제 있는 태그를 골라요. 고친 버전을 다시 배포할 때는 `BFF_IMAGE_TAG=latest`로 되돌려요.

## 확인

```bash
docker compose -f compose.prod.yml ps            # bff가 healthy인지
docker compose -f compose.prod.yml logs -f bff   # 로그
curl -s -o /dev/null -w '%{http_code}\n' localhost/bff/session   # 쿠키 없이 401이면 nginx → BFF 경로가 살아 있어요
curl -s -o /dev/null -w '%{http_code}\n' localhost/api/v1/products   # 200이면 nginx → BFF → app 경로가 살아 있어요
```

## 처음 올릴 때 순서

1. 백엔드의 nginx·네트워크 변경을 배포해요. 여기서 `paldo-edge`가 생기고 nginx가 BFF를 가리켜요. BFF를 올릴 때까지 `/api/v1/`이 502예요.
2. 바로 이어서 이 문서대로 BFF를 배포해요.
3. Vercel 주소를 거쳐 화면이 평소처럼 동작하는지, `/bff/session/login`을 curl로 불러 로그인 응답에 토큰 쿠키가 실리는지 확인해요.
