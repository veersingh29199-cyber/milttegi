# 운행일지·작전판

부산·경남에서 부업으로 대리운전을 하는 기사용 운행 기록 + 데이터 기반 대기 전략 도구.
기본은 폰 브라우저(localStorage)에 저장되고, Supabase를 연결하면 2인 1조 팀 기록을 공유할 수 있는 PWA입니다.

- 스택: Vite + React + TypeScript + Tailwind CSS v4 + PWA(vite-plugin-pwa)
- 저장: 기본 `localStorage`, 선택 사항으로 Supabase 팀 공유
- 다크 모드 기본, 모바일 한 손 조작 최적화

## 로컬 실행

```bash
npm install      # 처음 한 번, 의존성 설치
npm run dev      # 개발 서버 실행 → 브라우저에서 표시되는 주소 접속
```

기타 명령:

```bash
npm test         # 계산 규칙 단위 테스트(53개)
npm run build    # 프로덕션 빌드(dist/ 생성)
npm run preview  # 빌드 결과를 로컬에서 미리보기(PWA·오프라인 확인용)
```

## Vercel 배포 (무료)

이 저장소는 이미 GitHub에 올라가 있어, Vercel에 연결만 하면 됩니다.

1. <https://vercel.com> 접속 → **GitHub 계정으로 로그인**.
2. **Add New… → Project** 클릭.
3. 이 저장소(`milttegi`)를 **Import**.
4. Vercel이 자동으로 **Vite** 프로젝트로 인식합니다. 아래 값 확인만 하면 됩니다(대부분 자동):
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Deploy** 클릭 → 1~2분 뒤 `https://<프로젝트이름>.vercel.app` 주소가 나옵니다.

이후 GitHub `main`에 푸시할 때마다 Vercel이 **자동 재배포**합니다.
팀 공유를 쓰지 않으면 환경변수·API 키는 필요 없습니다.

## 2인 1조 팀 공유 설정

팀 공유는 Supabase 프로젝트가 있을 때만 켜집니다.

1. Supabase 프로젝트에서 Anonymous Sign-Ins를 활성화합니다.
2. SQL Editor에서 `supabase-team-share.sql` 내용을 실행합니다.
3. `.env.example`을 참고해 Vercel 환경변수 또는 로컬 `.env.local`에 아래 값을 넣습니다.

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

4. 앱 설정 탭 → **2인 1조 팀 공유**에서 새 팀 코드를 만들고 동료에게 전달합니다.
5. 동료는 같은 화면에서 팀 코드를 입력해 참여합니다.

팀 공유를 켜도 각 기기의 `localStorage` 기록은 백업처럼 남습니다.

## 운행내역 사진 불러오기

기록 탭의 **사진 불러오기**는 카카오 상세 내역 1건 또는 T맵 운행 내역 목록을 읽어 확인 후 일괄 저장합니다. 이 기능은 Vercel 서버 함수가 Gemini API를 사용하므로, Vercel 환경변수에 아래 값을 **Production**(미리보기 주소도 쓴다면 Preview 포함)으로 추가한 뒤 재배포해야 합니다.

```bash
GEMINI_API_KEY=your-server-only-gemini-api-key
```

`GEMINI_API_KEY`는 `VITE_` 접두사 없이 넣어야 합니다. 브라우저에 노출되면 안 되는 서버 전용 키입니다.

## 2인 1조 현재 작전

작전판은 완료 운행 통계 대신 현재 처리 중인 콜을 두 기기에서 맞추는 화면입니다. 각 기기에서 설정의 **이 기기 역할**을 `콜수행` 또는 `뒷차`로 정하세요.

팀 공유를 이미 설정했다면, [supabase-team-operations.sql](./supabase-team-operations.sql)을 Supabase SQL Editor에서 한 번 실행하세요. 이 SQL은 팀별 현재 작전 1건과 Realtime 구독을 추가하며, 기존 `shared_trips` 및 저장된 운행 기록은 변경하지 않습니다.

## 폰 홈 화면에 추가 (앱처럼 사용)

배포된 주소를 폰에서 연 뒤:

- **안드로이드 크롬**: 우측 상단 **⋮ 메뉴 → "홈 화면에 추가" / "앱 설치"** → 확인.
- **아이폰 사파리**: 하단 **공유 버튼(□↑) → "홈 화면에 추가"** → 추가.

추가하면 홈 화면 아이콘으로 실행되고, **오프라인(지하주차장 등 데이터 안 터지는 곳)에서도 완전히 동작**합니다.

## 데이터 보관 주의

- 팀 공유를 켜지 않은 기록은 **그 폰의 브라우저 안에만** 저장됩니다.
- 팀 공유를 켠 뒤 저장·수정·삭제한 운행 기록은 같은 팀 코드로 연결된 기기와 동기화됩니다.
- 브라우저 데이터 삭제·기기 변경 시 사라질 수 있으니, **설정 탭 → 데이터 백업 → 내보내기(JSON)** 로 가끔 파일을 저장해 두세요.
- 기기를 바꾸면 새 기기에서 **가져오기**로 복원합니다.

## 초기 설정 (첫 실행 후 꼭)

설정 탭에서 **본인 값으로 수정**하세요("수정 요망" 배지):

- 플랫폼 **수수료율** — 실제 정산 기준(수시 변동).
- **최소 시급** — 본인 기준.
- 즐겨찾기·내 구역 — 자주 다니는 지역/구역.
