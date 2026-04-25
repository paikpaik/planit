export type Locale = 'ko' | 'en';

let locale: Locale = 'ko';

export function setLocale(l: Locale): void {
  locale = l;
}

export function getLocale(): Locale {
  return locale;
}

// ── 요일 단축어 (0=일 ~ 6=토) ──
export function weekdayShort(): readonly string[] {
  return locale === 'ko'
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
}

// ── 월 단축어 (0=1월 ~ 11=12월) ──
function monthAbbr(): readonly string[] {
  return locale === 'ko'
    ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
}

// ── 날짜 포맷 헬퍼 ──
export function formatYearMonth(year: number, month: number): string {
  if (locale === 'ko') return `${year}년 ${month}월`;
  return `${monthAbbr()[month - 1]} ${year}`;
}

export function formatWeekRange(
  year: number, sm: number, sd: number, em: number, ed: number,
): string {
  if (locale === 'ko') {
    if (sm === em) return `${year}년 ${sm}월 ${sd}일 – ${ed}일`;
    return `${sm}월 ${sd}일 – ${em}월 ${ed}일`;
  }
  if (sm === em) return `${monthAbbr()[sm - 1]} ${sd} – ${ed}`;
  return `${monthAbbr()[sm - 1]} ${sd} – ${monthAbbr()[em - 1]} ${ed}`;
}

export function formatDayFull(year: number, month: number, day: number, dow: number): string {
  const wd = weekdayShort()[dow];
  if (locale === 'ko') return `${year}년 ${month}월 ${day}일 (${wd})`;
  return `${monthAbbr()[month - 1]} ${day}, ${year} (${wd})`;
}

export function formatMonthDay(month: number, day: number, dow: number): string {
  const wd = weekdayShort()[dow];
  if (locale === 'ko') return `${month}월 ${day}일 (${wd})`;
  return `${monthAbbr()[month - 1]} ${day} (${wd})`;
}

// ── 번역 사전 ──

const ko = {
  // 날짜
  'date.today': '오늘',
  'date.tomorrow': '내일',

  // 사이드바
  'sidebar.lists': '리스트',
  'sidebar.allLists': '전체',
  'sidebar.newList': '새 리스트',
  'sidebar.tags': '태그',
  'sidebar.open': '리스트 펼치기',
  'sidebar.close': '리스트 접기',
  'sidebar.listMenu': '리스트 메뉴',

  // 툴바
  'toolbar.today': '오늘',
  'toolbar.search': '태스크 검색',
  'toolbar.month': '월',
  'toolbar.week': '주',
  'toolbar.day': '일',
  'toolbar.monthAriaLabel': '월 뷰',
  'toolbar.weekAriaLabel': '주 뷰',
  'toolbar.dayAriaLabel': '일 뷰',

  // 스마트 뷰
  'smartView.today': '오늘',
  'smartView.upcoming': '예정',
  'smartView.todayEmpty': '오늘 할 일이 없습니다',
  'smartView.upcomingEmpty': '예정된 일정이 없습니다',
  'smartView.inboxEmpty': '받은 편지함이 비어 있습니다',
  'smartView.noteEmpty': '이 노트에 연결된 태스크가 없습니다',
  'smartView.addToToday': '오늘에 추가',
  'smartView.addToInbox': 'Inbox에 추가',

  // 태스크
  'task.done': '완료 처리',
  'task.undone': '완료 해제',

  // 일 뷰
  'dayView.allDay': '종일',

  // 리스트 메뉴
  'list.edit': '편집',
  'list.delete': '삭제',
  'list.deleteConfirm': '"{name}"에 {count}개 태스크가 있습니다. 삭제하면 태스크가 Inbox로 이동합니다. 계속할까요?',
  'list.deleteError': '리스트 삭제 실패: {msg}',

  // 공통 버튼
  'btn.cancel': '취소',
  'btn.save': '저장',
  'btn.delete': '삭제',

  // 시간 유효성
  'error.startTime': '시작 시간 형식이 올바르지 않습니다 (HH:mm)',
  'error.endTime': '종료 시간 형식이 올바르지 않습니다 (HH:mm)',

  // EditTaskModal
  'editTask.heading': '태스크 편집',
  'editTask.labelDate': '날짜',
  'editTask.labelTime': '시간',
  'editTask.labelList': '리스트',
  'editTask.labelPriority': '우선순위',
  'editTask.labelTags': '태그',
  'editTask.labelRecurrence': '반복',
  'editTask.labelNote': '노트',
  'editTask.labelDescription': '설명',
  'editTask.titlePlaceholder': '제목',
  'editTask.memoPlaceholder': '메모',
  'editTask.tagPlaceholder': '태그 입력 후 Enter',
  'editTask.removeTag': '#{tag} 삭제',
  'editTask.unlinkNote': '연결 해제',
  'editTask.linkNote': '노트 연결',

  // 우선순위
  'priority.none': '없음',
  'priority.low': '낮음',
  'priority.med': '보통',
  'priority.high': '높음',

  // 반복
  'recurrence.none': '없음',
  'recurrence.daily': '매일',
  'recurrence.weekly': '매주',
  'recurrence.monthly': '매월',
  'recurrence.nweekly': 'N주마다',
  'recurrence.dayUnit': '일',
  'recurrence.weekUnit': '주마다',

  // QuickAddModal
  'quickAdd.heading': '태스크 추가',
  'quickAdd.noDate': '날짜 없음 (Inbox)',
  'quickAdd.titlePlaceholder': '제목',
  'quickAdd.startAriaLabel': '시작 시간',
  'quickAdd.endAriaLabel': '종료 시간',

  // SearchModal
  'search.placeholder': '태스크 검색...',
  'search.noMatch': '일치하는 태스크가 없습니다',
  'search.hint': '제목, 설명, 태그로 검색하세요',

  // NotePickerModal
  'notePicker.placeholder': '노트 검색...',

  // ListEditorModal
  'listEditor.createTitle': '새 리스트',
  'listEditor.editTitle': '리스트 편집',
  'listEditor.namePlaceholder': '리스트 이름',
  'listEditor.colorLabel': '색상',

  // 설정
  'settings.weekStart': '주 시작일',
  'settings.weekStartDesc': '캘린더 그리드의 첫 번째 요일을 설정합니다.',
  'settings.monday': '월요일',
  'settings.sunday': '일요일',
  'settings.defaultList': '기본 리스트',
  'settings.defaultListDesc': '새 태스크를 추가할 때 기본으로 선택되는 리스트입니다.',
  'settings.language': '언어',
  'settings.languageDesc': 'UI 표시 언어를 설정합니다.',
  'settings.korean': '한국어',
  'settings.sidebar': '사이드바 기본 펼침',
  'settings.sidebarDesc': 'Planit을 열 때 리스트 사이드바를 기본으로 펼쳐둡니다.',
} as const;

type Translations = typeof ko;

// `en` must cover every key in `ko` (enforced at compile time)
const en: { [K in keyof Translations]: string } = {
  'date.today': 'Today',
  'date.tomorrow': 'Tomorrow',

  'sidebar.lists': 'Lists',
  'sidebar.allLists': 'All',
  'sidebar.newList': 'New List',
  'sidebar.tags': 'Tags',
  'sidebar.open': 'Expand lists',
  'sidebar.close': 'Collapse lists',
  'sidebar.listMenu': 'List menu',

  'toolbar.today': 'Today',
  'toolbar.search': 'Search tasks',
  'toolbar.month': 'Month',
  'toolbar.week': 'Week',
  'toolbar.day': 'Day',
  'toolbar.monthAriaLabel': 'Month view',
  'toolbar.weekAriaLabel': 'Week view',
  'toolbar.dayAriaLabel': 'Day view',

  'smartView.today': 'Today',
  'smartView.upcoming': 'Upcoming',
  'smartView.todayEmpty': 'No tasks today',
  'smartView.upcomingEmpty': 'No upcoming tasks',
  'smartView.inboxEmpty': 'Inbox is empty',
  'smartView.noteEmpty': 'No tasks linked to this note',
  'smartView.addToToday': 'Add to Today',
  'smartView.addToInbox': 'Add to Inbox',

  'task.done': 'Mark done',
  'task.undone': 'Mark undone',

  'dayView.allDay': 'All day',

  'list.edit': 'Edit',
  'list.delete': 'Delete',
  'list.deleteConfirm': '"{name}" has {count} tasks. They will be moved to Inbox. Continue?',
  'list.deleteError': 'Failed to delete list: {msg}',

  'btn.cancel': 'Cancel',
  'btn.save': 'Save',
  'btn.delete': 'Delete',

  'error.startTime': 'Invalid start time format (HH:mm)',
  'error.endTime': 'Invalid end time format (HH:mm)',

  'editTask.heading': 'Edit Task',
  'editTask.labelDate': 'Date',
  'editTask.labelTime': 'Time',
  'editTask.labelList': 'List',
  'editTask.labelPriority': 'Priority',
  'editTask.labelTags': 'Tags',
  'editTask.labelRecurrence': 'Repeat',
  'editTask.labelNote': 'Note',
  'editTask.labelDescription': 'Description',
  'editTask.titlePlaceholder': 'Title',
  'editTask.memoPlaceholder': 'Notes',
  'editTask.tagPlaceholder': 'Type tag then Enter',
  'editTask.removeTag': 'Remove #{tag}',
  'editTask.unlinkNote': 'Unlink',
  'editTask.linkNote': 'Link note',

  'priority.none': 'None',
  'priority.low': 'Low',
  'priority.med': 'Med',
  'priority.high': 'High',

  'recurrence.none': 'None',
  'recurrence.daily': 'Daily',
  'recurrence.weekly': 'Weekly',
  'recurrence.monthly': 'Monthly',
  'recurrence.nweekly': 'Every N weeks',
  'recurrence.dayUnit': 'th',
  'recurrence.weekUnit': 'weeks',

  'quickAdd.heading': 'Add Task',
  'quickAdd.noDate': 'No date (Inbox)',
  'quickAdd.titlePlaceholder': 'Title',
  'quickAdd.startAriaLabel': 'Start time',
  'quickAdd.endAriaLabel': 'End time',

  'search.placeholder': 'Search tasks...',
  'search.noMatch': 'No matching tasks',
  'search.hint': 'Search by title, description, or tag',

  'notePicker.placeholder': 'Search notes...',

  'listEditor.createTitle': 'New List',
  'listEditor.editTitle': 'Edit List',
  'listEditor.namePlaceholder': 'List name',
  'listEditor.colorLabel': 'Color',

  'settings.weekStart': 'Week start',
  'settings.weekStartDesc': 'First day of the week in the calendar grid.',
  'settings.monday': 'Monday',
  'settings.sunday': 'Sunday',
  'settings.defaultList': 'Default list',
  'settings.defaultListDesc': 'Default list when adding a new task.',
  'settings.language': 'Language',
  'settings.languageDesc': 'UI display language.',
  'settings.korean': '한국어',
  'settings.sidebar': 'Expand sidebar by default',
  'settings.sidebarDesc': 'Expand the list sidebar when Planit opens.',
};

export type TranslationKey = keyof Translations;

export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const dict = locale === 'ko' ? (ko as Record<string, string>) : (en as Record<string, string>);
  let str = dict[key] ?? key;
  if (!vars) return str;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return str;
}
