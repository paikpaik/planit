# Planit

Obsidian용 캘린더 + 태스크 통합 플러그인. TickTick에서 영감을 받아, UI에서 직접 일정을 관리하면서 대화형 AI 도구와도 파일 기반으로 자연스럽게 연동됩니다.

## 왜 만들었나

Obsidian은 기본적으로 마크다운 중심입니다. `Full Calendar`, `Tasks` 같은 커뮤니티 플러그인도 훌륭하지만, **캘린더 UI에서 직접 CRUD**를 하면서 **내 취향대로 커스터마이즈**하고 싶어 만들었습니다. 여기에 대화형 AI가 `.planit/tasks.json`을 읽고 쓸 수 있어, 자연어로 "내일 오후 2시 미팅 추가해줘"를 시키면 캘린더에 그대로 반영됩니다.

## 설계 원칙

1. **저장 포맷이 인터페이스** — JSON 스키마가 대화형 AI와의 연동 규약
2. **UI 우선** — 캘린더에서 클릭/드래그로 모든 작업 가능
3. **Obsidian 네이티브** — Daily Note 링크, 테마 변수 존중
4. **독립 동작** — 대화형 AI 없이도 단독으로 기능. 대화형 AI는 선택적 보너스

## 현재 기능

### 뷰

- [x] 월 뷰 — 캘린더 그리드 (이전/다음 달, 오늘 하이라이트, 요일 헤더)
- [x] 주 뷰 — 7컬럼 그리드, 이전/다음 주 이동, 주 범위 제목 표시
- [x] 뷰 토글 — 툴바 `월 | 주` 버튼으로 즉시 전환
- [x] 주 시작일 설정 (월요일 / 일요일)

### 스마트 뷰 (사이드바)

- [x] **오늘** — 오늘 날짜의 태스크 목록
- [x] **예정** — 내일부터 7일간 태스크 (날짜별 그룹)
- [x] **Inbox** — 날짜 없는 태스크 목록
- [x] 각 항목에 미완료 태스크 수 배지 표시

### 태스크

- [x] 태스크 칩 표시 (시간 + 제목, 리스트 색상 테두리)
- [x] 우선순위 시각화 — 칩에 컬러 점 표시 (높음=빨강, 보통=주황, 낮음=파랑)
- [x] 편집 모달 우선순위 버튼 그룹 (높음 / 보통 / 낮음 / 없음)
- [x] 칩 완료 체크박스 토글
- [x] 칩 클릭 → 상세 편집 모달 (제목, 날짜, 시간, 리스트, 우선순위, 태그, 설명, 서브태스크)
- [x] 서브태스크 인라인 추가/완료 토글/삭제
- [x] 드래그앤드롭으로 날짜 이동 (월 뷰)
- [x] 빈 셀/영역 클릭 → 빠른 추가 모달

### 태그

- [x] 편집 모달에서 태그 추가 (Enter / 쉼표 입력, pill 형태 표시, 클릭 삭제)
- [x] 사이드바 하단에 태그 목록 자동 표시
- [x] 태그 클릭으로 필터 (캘린더·스마트 뷰 공통), 재클릭으로 해제

### 리스트 사이드바

- [x] 좌측 사이드바 (토글 버튼, 상태 저장)
- [x] 리스트 생성/편집/삭제 (색상 선택 포함)
- [x] 리스트별 필터링
- [x] 리스트 삭제 시 소속 태스크 자동 Inbox 이동

### 저장 및 연동

- [x] JSON 기반 데이터 저장 (`.planit/tasks.json`, `.planit/lists.json`)
- [x] TaskStore / ListStore 구독 패턴 — 데이터 변경 시 자동 리렌더
- [x] 외부 파일 변경 실시간 반영 (Claudian 등 AI 도구 연동 체감 개선)

### 설정

- [x] Obsidian 설정 탭 (설정 → Planit)
  - 주 시작일 (월요일 / 일요일)
  - 기본 리스트 드롭다운
  - 언어 선택 (ko / en, 전체 i18n은 추후)
  - 사이드바 기본 펼침 여부

## 로드맵

### v0.3+

- [ ] 반복 일정 (RRULE 서브셋)
- [ ] 리마인더/알림
- [ ] Daily Note `noteRef` 양방향 링크
- [ ] 검색 / 퀵 점프
- [ ] 일 뷰 (시간대 그리드)
- [ ] 드래그로 시간 리사이즈 (주/일 뷰)
- [ ] 다국어 (ko/en) 완전 지원

## 설치 (개발 빌드)

```bash
git clone <repo> planit
cd planit
npm install
cp .env.local.example .env.local
# .env.local에서 OBSIDIAN_VAULT 경로 설정
npm run dev       # watch 모드 — 저장 시 자동 빌드 + vault 복사
```

Obsidian에서 **설정 → 커뮤니티 플러그인 → Installed**에서 Planit을 활성화하세요. 좌측 리본의 📅 아이콘 또는 명령어 팔레트(`Cmd+P`)에서 "Open Planit" 실행.

## 저장 포맷

```jsonc
// .planit/tasks.json
{
  "schemaVersion": 1,
  "tasks": [
    {
      "id": "tsk_...",
      "title": "디자인 리뷰",
      "listId": "list_inbox",
      "tags": ["meeting"],
      "date": "2026-04-20",       // YYYY-MM-DD | null (null = Inbox)
      "start": "14:00",           // HH:mm | null (null + date = 종일)
      "end":   "15:00",           // HH:mm | null
      "priority": "med",          // none | low | med | high
      "done": false,
      "completedAt": null,
      "description": "",
      "subtasks": [],
      "noteRef": null,            // "Daily/2026-04-20.md" 등 (선택)
      "createdAt": 1700000000000,
      "updatedAt": 1700000000000
    }
  ]
}
```

```jsonc
// .planit/lists.json
{
  "lists": [
    { "id": "list_inbox", "name": "Inbox", "color": "#8A8A8A", "order": 0 }
  ]
}
```

## paikpaik/Claudian 연동

Planit은 Claudian과 **직접적인 코드 의존성이 없습니다**. Claudian에게 자연어로 "내일 오후 2시 디자인 리뷰 추가해줘"를 요청하면, Claudian이 `.planit/tasks.json`에 JSON 객체를 한 건 추가하는 방식으로 동작합니다. 포맷만 맞으면 어떤 Claude 클라이언트든 사용할 수 있습니다.

Claudian 시스템 프롬프트에 이 README의 "저장 포맷" 섹션을 붙여넣으면 바로 동작합니다.

## 개발

```bash
npm run typecheck   # 타입 검사
npm run lint        # 린트
npm run test        # 테스트 (Jest, unit + integration)
npm run build       # 프로덕션 빌드
```

아키텍처와 모듈 규칙은 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

## 라이선스

MIT © paikpaik
