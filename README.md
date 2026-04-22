# Planit

Obsidian용 캘린더 + 태스크 통합 플러그인. TickTick에서 영감을 받아, UI에서 직접 일정을 관리하면서 대화형 AI 도구와도 파일 기반으로 자연스럽게 연동됩니다.

## 왜 만들었나

Obsidian은 기본적으로 마크다운 중심입니다. `Full Calendar`, `Tasks` 같은 커뮤니티 플러그인도 훌륭하지만, **캘린더 UI에서 직접 CRUD**를 하면서 **내 취향대로 커스터마이즈**하고 싶어 만들었습니다. 여기에 대화형 AI가 `.planit/tasks.json`을 읽고 쓸 수 있어, 자연어로 "내일 오후 2시 미팅 추가해줘"를 시키면 캘린더에 그대로 반영됩니다.

## 설계 원칙

1. **저장 포맷이 인터페이스** — JSON 스키마가 대화형 AI와의 연동 규약
2. **UI 우선** — 캘린더에서 클릭/드래그로 모든 작업 가능
3. **Obsidian 네이티브** — Daily Note 링크, 테마 변수 존중
4. **독립 동작** — 대화형 AI 없이도 단독으로 기능. 대화형 AI는 선택적 보너스

## 현재 기능 (v0.0.1)

- [x] 월 캘린더 그리드 (이전/다음 달 이동, 오늘 하이라이트, 요일 헤더)
- [x] JSON 기반 데이터 저장 (`.planit/tasks.json`, `.planit/lists.json`)
- [x] TaskStore 구독 패턴 — 데이터 변경 시 자동 리렌더
- [x] 셀에 태스크 칩 표시 (시간 + 제목, 3개 초과 시 `+N` 오버플로)
- [x] "Seed sample task on today" 명령어 (개발용)

## 로드맵

### MVP (v0.1)

- [ ] 빈 셀 클릭 → 빠른 추가 모달 (제목, 날짜, 시간, 리스트 선택)
- [ ] 태스크 칩 완료 체크박스 토글
- [ ] 태스크 클릭 → 상세 편집 모달 (설명, 우선순위, 태그)
- [ ] 드래그 앤 드롭으로 날짜 이동
- [ ] 좌측 리스트 사이드바 (Inbox, 사용자 리스트)
- [ ] 외부 파일 변경 실시간 반영 (Claudian 연동 체감 개선)
- [ ] 설정 탭 (주 시작일, 기본 리스트, 로케일)

### v0.2

- [ ] 주 뷰 / 일 뷰
- [ ] 리스트 CRUD + 색상 지정
- [ ] 태그 필터
- [ ] 우선순위 시각화 (테두리 색상 등)
- [ ] 키보드 단축키 (이전/다음 달, 오늘, 새 태스크)

### v0.3+

- [ ] 반복 일정 (RRULE 서브셋)
- [ ] 리마인더/알림
- [ ] 서브태스크 UI
- [ ] Daily Note `noteRef` 양방향 링크
- [ ] 검색 / 퀵 점프
- [ ] 드래그로 시간 리사이즈 (주/일 뷰)
- [ ] 다국어 (ko/en)

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
