# CLAUDE.md

## 프로젝트 개요

Planit — Obsidian 캘린더 + 태스크 통합 플러그인. TickTick에서 영감을 받아, 시간 유무로 이벤트/태스크를 자연스럽게 구분하는 단일 Task 모델을 사용한다. UI가 메인이고, Claudian 같은 대화형 도구는 `.planit/` JSON을 읽고 써서 연동한다.

## 명령어

```bash
npm run dev        # 개발 (watch)
npm run build      # 프로덕션 빌드
npm run typecheck  # 타입 검사
npm run lint       # 린트
npm run lint:fix   # 린트 자동 수정
npm run test       # 테스트
npm run test:watch # 테스트 watch
```

## 아키텍처

| 레이어 | 역할 |
|--------|------|
| **core** | 인프라 (기능 의존성 없음). `types/`, `storage/` |
| **features** | 기능별 모듈. 현재 `calendar/` (PlanitView) |
| **shared** | 재사용 UI (현재 비어있음) |
| **i18n** | 국제화 (예정) |
| **utils** | 유틸리티 (예정) |
| **style** | 모듈형 CSS. `index.css`의 @import 순서가 빌드 순서 |

### 의존성 규칙 (ESLint `no-restricted-imports`로 강제)

- `core/*`는 `features/*`, `shared/*`를 import 금지
- `types/*`는 어디서든 import 가능

## 저장 포맷

| 파일 | 내용 |
|------|------|
| `.planit/tasks.json` | 모든 태스크 (단일 파일, MVP) |
| `.planit/lists.json` | 리스트 정의 |

`Task`는 이벤트/태스크를 통합한 단일 엔티티. 시간 필드(`date`, `start`, `end`)가 다 null이면 Inbox, `date`만 있으면 종일, `date+start`는 특정 시각.

## 빌드·배포

- `esbuild.config.mjs` — `src/main.ts` → `main.js` (cjs, es2018)
- `scripts/build-css.mjs` — `src/style/index.css` @import 순서대로 concat. 미포함 CSS가 있으면 빌드 실패
- `scripts/build.mjs` — CSS 빌드 후 esbuild (production)
- `scripts/sync-version.js` — `npm version`이 호출, `package.json` → `manifest.json` 동기화
- `.env.local`의 `OBSIDIAN_VAULT` 설정 시 개발 빌드 결과를 vault의 플러그인 폴더로 자동 복사
- `.github/workflows/ci.yml` — push/PR에서 lint/typecheck/test (Node 22)
- `.github/workflows/release.yml` — 태그 푸시 시 build → `main.js`, `manifest.json`, `styles.css` 첨부 (Node 20)

## 테스트

- Jest + ts-jest, `tests/unit/`과 `tests/integration/` projects 분리
- `tests/__mocks__/obsidian.ts` — Obsidian API mock
- `tests/` 경로는 `src/` 구조 미러링
- path alias: `@/*` → `src/*`, `@test/*` → `tests/*`

## 개발 참고

- 편집 후 `npm run typecheck && npm run lint && npm run test && npm run build` 실행
- **TDD 권장**: 새 기능·버그 수정 시 테스트를 먼저 작성 (red-green-refactor)
- **주석**: WHY만. WHAT(함수명 반복)은 금지
- 프로덕션 코드에 `console.*` 사용 금지 — 사용자 알림은 Obsidian `Notice`
- 개발용 임시 스크립트·문서는 `dev/`에 (git ignored)
- `dev/claudian/`은 참조용 Claudian 소스 복사본 — 수정 금지, 필요 시 원본 레포(`/Users/nojaeyeol/source/claudian`) 확인
