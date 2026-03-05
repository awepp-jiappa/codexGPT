# nas-gpt-chat (Synology NAS-focused)

Synology NAS에서 바로 운영 가능한 self-hosted ChatGPT 스타일 앱입니다.
운영자가 실제 배포/점검/복구까지 수행할 수 있도록 문서를 운영 매뉴얼 중심으로 정리했습니다.

---

## 운영 가이드 (Operation Manual)

### 1. 전체 아키텍처 개요

트래픽 흐름:

브라우저  
→ Synology Reverse Proxy  
→ Docker (nas-gpt-chat)  
→ OpenAI API

운영 핵심 포인트:
- 브라우저는 절대 `api.openai.com`을 직접 호출하지 않습니다.
- `OPENAI_API_KEY`는 서버(컨테이너)에서만 사용합니다.
- 사용자는 NAS 도메인(예: `chat.awesomepp.synology.me`)만 접근합니다.
- OpenAI 요청/응답 제어는 앱 서버에서 수행합니다.

---

### 2. Synology 배포 단계 (Step-by-step)

#### ① Docker compose 실행

1) NAS에 프로젝트 폴더 준비
- 예시: `/volume1/docker/nas-gpt-chat/app`
- 영속 데이터: `/volume1/docker/nas-gpt-chat/data`

2) 코드와 `.env` 준비 후 실행

```bash
docker compose up -d
```

3) 상태 확인
- 컨테이너 이름: `nas-gpt-chat`
- 앱 포트: `3000`
- DB 파일: `data/nas-gpt-chat.db`

#### ② Synology Reverse Proxy 설정

DSM 경로:
- 제어판(Control Panel) → 로그인 포털(Login Portal) → 고급(Advanced) → Reverse Proxy

필수 매핑:
- 외부(소스): `https://chat.awesomepp.synology.me`
- 내부(대상): `http://NAS-IP:3000`

권장:
- 외부는 HTTPS만 허용
- HTTP 접근은 HTTPS로 리다이렉트

#### ③ 권장 설정

- HTTPS 필수
- timeout 300초 이상 (SSE 때문)
- buffering 비활성 권장

실무 팁:
- SSE는 장시간 연결을 유지합니다.
- timeout이 짧으면 답변이 중간에 끊깁니다.
- 프록시 변환/버퍼링이 켜져 있으면 스트리밍이 지연될 수 있습니다.

---

### 3. 최초 설정 (First Setup)

#### 관리자 계정 생성

- 최초 실행(빈 DB) 후 `/register` 접속
- 첫 번째로 생성한 계정이 자동 관리자(admin) 권한을 가집니다.
- 이후 `/admin`에서 일반 사용자 생성/비활성화가 가능합니다.

#### 기본 회원가입 차단

- 기본값: `ALLOW_PUBLIC_SIGNUP=false`
- 의미: 최초 부트스트랩 이후 공개 회원가입 차단
- 운영 권장: 인터넷 공개 환경에서는 계속 `false` 유지

#### 환경변수 설정 방법 (`.env`)

1) 템플릿 복사

```bash
cp .env.example .env
```

2) 필수 값 입력

```env
OPENAI_API_KEY=sk-...
APP_URL=https://chat.awesomepp.synology.me
AUTH_SECRET=충분히_긴_랜덤_문자열
ALLOW_PUBLIC_SIGNUP=false
BUILD_VERSION=1.0.0
DATABASE_URL=file:/data/nas-gpt-chat.db
```

3) 변경 후 재기동

```bash
docker compose up -d
```

---

### 4. 운영 중 점검 체크리스트

정기 점검 체크리스트:

- [ ] 로그인 정상 동작
- [ ] 채팅 저장 정상
- [ ] SSE 스트리밍 정상
- [ ] DevTools에서 `api.openai.com` 호출 없음
- [ ] Docker 상태 정상

빠른 확인 명령:

```bash
docker ps --filter "name=nas-gpt-chat"
```

```bash
docker logs nas-gpt-chat --tail 100
```

---

### 5. 백업 및 복구

#### SQLite 백업 방법

1) 쓰기 중지

```bash
docker compose down
```

2) `/data` 폴더 백업
- 예: `/volume1/docker/nas-gpt-chat/data` 전체 복사
- 핵심 파일: `nas-gpt-chat.db`

#### 복구 방법

1) 백업한 `data` 복사
2) 컨테이너 재기동

```bash
docker compose up -d
```

3) 로그인/채팅 이력 확인

운영 팁:
- 백업은 주기적으로 자동화 권장(예: Hyper Backup + 스냅샷)
- 복구 테스트를 분기별 1회 이상 수행 권장

---

### 6. 장애 대응 (Troubleshooting)

■ 채팅 안됨
- `.env`의 `OPENAI_API_KEY`, `APP_URL` 확인
- 컨테이너 로그 확인 (`docker logs nas-gpt-chat -f`)
- OpenAI API 사용량/과금 상태 확인

■ 스트리밍 끊김
- reverse proxy timeout 300초 이상인지 확인
- proxy buffering 비활성화 여부 확인
- 네트워크 품질(업링크/방화벽) 확인

■ 로그인 실패
- 비밀번호 오류 누적으로 lockout 되었는지 확인
- 세션/쿠키 문제 확인 (브라우저 쿠키 삭제 후 재시도)
- 도메인/HTTPS 혼용 접속 여부 확인

■ `api.openai.com` 호출 발생
- 프론트 설정 오류
- 브라우저에서 OpenAI 직접 호출 코드가 들어갔는지 확인
- 모든 요청이 NAS 도메인 기준 same-origin인지 확인

---

### 7. 로그 확인 방법

실시간 로그:

```bash
docker logs nas-gpt-chat -f
```

정상 로그 예시(형태 예시):
- 앱 시작 완료 로그
- `/api/health` 200 응답 로그
- 로그인 성공 로그
- 채팅 요청 수신 및 스트리밍 완료 로그

확인 포인트:
- 에러 스택 반복 여부
- 401/403/429 빈도
- 응답 지연 시간 증가 추세

---

### 8. 보안 권장사항

- Reverse Proxy Basic Auth 권장
- 외부 공개 시 rate limit 필수
- 관리자 계정 보호 중요

실무 보안 체크:
- 관리자 비밀번호 주기적 변경
- `AUTH_SECRET` 충분히 길게 유지
- HTTPS 인증서 자동 갱신 상태 점검
- 불필요한 NAS 포트 외부 노출 금지

---


---

## UX 기능 (Near-ChatGPT Lightweight UX)

현재 UI/UX는 NAS 환경에서 가볍게 동작하도록 다음 기능을 포함합니다.

- Stop generating 버튼 + `AbortController` 기반 스트리밍 중단
- 중단 시 partial assistant 응답 보존
- 마지막 assistant 메시지에서 Regenerate response 제공
- 첫 user 메시지 기반 대화 제목 자동 생성(약 6~10 단어)
- 사이드바 검색: 제목 + 전체 메시지 본문 클라이언트 필터
- 안전한 Markdown 렌더링
  - 코드 블록
  - 인라인 코드
  - 리스트
  - 링크(`http/https`만 허용)
  - HTML 미사용(React 텍스트 노드 기반)
- 코드 블록 Copy 버튼 + Copied 상태 표시
- 스트리밍 중 타이핑 인디케이터
- Settings 패널
  - 모델 선택
  - temperature 슬라이더
  - system prompt
  - 사용자별 DB 저장(`/api/settings`)
- UX 다듬기
  - 자동 스크롤
  - settings 로딩 상태
  - 스트리밍 중 전송 비활성화
  - 키보드 UX(Enter 전송, Shift+Enter 줄바꿈, Ctrl/Cmd+K 검색 포커스, ESC 중단)

성능 원칙:
- OpenAI API 호출은 서버에서만 수행
- 브라우저는 same-origin API(`/api/chat`)만 호출
- 별도 무거운 Markdown 라이브러리 없이 경량 파서 사용


## 개발/운영 참고

### 로컬 개발

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

### 품질 점검

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```
