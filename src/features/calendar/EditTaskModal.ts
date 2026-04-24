import type { App } from 'obsidian';
import { Modal, Notice, setIcon } from 'obsidian';

import type { List, Priority, RecurrenceRule, Task } from '../../core/types';
import { DAY_LABELS } from '../../utils/recurrence';
import { buildTaskPatch } from './editTask';
import { parseTimeInput } from './quickAdd';

const PRIORITY_LABELS: Record<Priority, string> = {
  none: '없음',
  low: '낮음',
  med: '보통',
  high: '높음',
};

export interface EditTaskCallbacks {
  onSave: (patch: ReturnType<typeof buildTaskPatch>) => Promise<void>;
  onDelete: () => Promise<void>;
}

export class EditTaskModal extends Modal {
  constructor(
    app: App,
    private task: Task,
    private lists: List[],
    private callbacks: EditTaskCallbacks
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('planit-edit-task');

    contentEl.createEl('h3', { text: '태스크 편집', cls: 'planit-edit-task-heading' });

    const titleInput = contentEl.createEl('input', {
      type: 'text',
      cls: 'planit-edit-task-input',
      attr: { placeholder: '제목' },
    }) as HTMLInputElement;
    titleInput.value = this.task.title;

    const dateRow = contentEl.createDiv({ cls: 'planit-edit-task-row' });
    dateRow.createEl('label', { text: '날짜', cls: 'planit-edit-task-label' });
    const dateInput = dateRow.createEl('input', {
      type: 'date',
      cls: 'planit-edit-task-date',
    }) as HTMLInputElement;
    dateInput.value = this.task.date ?? '';

    const timeRow = contentEl.createDiv({ cls: 'planit-edit-task-row' });
    timeRow.createEl('label', { text: '시간', cls: 'planit-edit-task-label' });
    const startInput = timeRow.createEl('input', {
      type: 'text',
      cls: 'planit-quick-add-time',
      attr: { placeholder: 'HH:mm' },
    }) as HTMLInputElement;
    startInput.value = this.task.start ?? '';
    timeRow.createSpan({ cls: 'planit-quick-add-time-sep', text: '—' });
    const endInput = timeRow.createEl('input', {
      type: 'text',
      cls: 'planit-quick-add-time',
      attr: { placeholder: 'HH:mm' },
    }) as HTMLInputElement;
    endInput.value = this.task.end ?? '';

    const listRow = contentEl.createDiv({ cls: 'planit-edit-task-row' });
    listRow.createEl('label', { text: '리스트', cls: 'planit-edit-task-label' });
    const listSelect = listRow.createEl('select', {
      cls: 'planit-edit-task-select',
    }) as HTMLSelectElement;
    for (const list of this.lists) {
      const opt = listSelect.createEl('option', {
        value: list.id,
        text: list.name,
      }) as HTMLOptionElement;
      if (list.id === this.task.listId) opt.selected = true;
    }

    const priorityRow = contentEl.createDiv({ cls: 'planit-edit-task-row' });
    priorityRow.createEl('label', { text: '우선순위', cls: 'planit-edit-task-label' });
    const priorityBtns = priorityRow.createDiv({ cls: 'planit-priority-btns' });
    let selectedPriority: Priority = this.task.priority;
    const priorityButtons = new Map<Priority, HTMLButtonElement>();
    for (const p of ['high', 'med', 'low', 'none'] as Priority[]) {
      const btn = priorityBtns.createEl('button', {
        cls: `planit-priority-btn priority-${p}`,
        text: PRIORITY_LABELS[p],
      });
      if (p === selectedPriority) btn.addClass('is-active');
      btn.addEventListener('click', () => {
        selectedPriority = p;
        priorityButtons.forEach((b, key) => b.toggleClass('is-active', key === p));
      });
      priorityButtons.set(p, btn);
    }

    const tagRow = contentEl.createDiv({ cls: 'planit-edit-task-row planit-edit-task-row-wrap' });
    tagRow.createEl('label', { text: '태그', cls: 'planit-edit-task-label' });
    const tagArea = tagRow.createDiv({ cls: 'planit-tag-area' });
    let currentTags: string[] = [...this.task.tags];

    const renderTagChips = (): void => {
      tagArea.empty();
      for (const tag of currentTags) {
        const chip = tagArea.createSpan({ cls: 'planit-tag-chip' });
        chip.createSpan({ text: `#${tag}` });
        const removeBtn = chip.createEl('button', {
          cls: 'planit-tag-chip-remove',
          attr: { 'aria-label': `#${tag} 삭제` },
        });
        setIcon(removeBtn, 'x');
        removeBtn.addEventListener('click', () => {
          currentTags = currentTags.filter((t) => t !== tag);
          renderTagChips();
        });
      }
      const input = tagArea.createEl('input', {
        cls: 'planit-tag-input',
        attr: { placeholder: currentTags.length === 0 ? '태그 입력 후 Enter' : '' },
      }) as HTMLInputElement;
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = input.value.replace(/^#/, '').replace(/,/g, '').trim();
          if (val && !currentTags.includes(val)) {
            currentTags = [...currentTags, val];
            renderTagChips();
          } else {
            input.value = '';
          }
        }
        if (e.key === 'Backspace' && input.value === '' && currentTags.length > 0) {
          currentTags = currentTags.slice(0, -1);
          renderTagChips();
        }
      });
    };
    renderTagChips();

    // ── 반복 설정 ──
    const recRow = contentEl.createDiv({ cls: 'planit-edit-task-row' });
    recRow.createEl('label', { text: '반복', cls: 'planit-edit-task-label' });
    const recWrapper = recRow.createDiv({ cls: 'planit-recurrence' });

    let currentRecurrence: RecurrenceRule | null = this.task.recurrence;

    const typeSelect = recWrapper.createEl('select', {
      cls: 'planit-edit-task-select planit-recurrence-type',
    }) as HTMLSelectElement;
    for (const [val, label] of [
      ['none', '없음'], ['daily', '매일'], ['weekly', '매주'],
      ['monthly', '매월'], ['nweekly', 'N주마다'],
    ] as [string, string][]) {
      typeSelect.createEl('option', { value: val, text: label });
    }
    typeSelect.value = currentRecurrence?.type ?? 'none';

    const subEl = recWrapper.createDiv({ cls: 'planit-recurrence-sub' });

    const renderSub = (): void => {
      subEl.empty();
      const type = typeSelect.value;

      if (type === 'none' || type === 'daily') {
        currentRecurrence = type === 'none' ? null : { type: 'daily' };
        return;
      }

      if (type === 'monthly') {
        const existing = currentRecurrence?.type === 'monthly' ? currentRecurrence.day : 1;
        const numInput = subEl.createEl('input', {
          cls: 'planit-recurrence-num',
          attr: { type: 'number', min: '1', max: '31', value: String(existing) },
        }) as HTMLInputElement;
        subEl.createSpan({ cls: 'planit-recurrence-unit', text: '일' });
        currentRecurrence = { type: 'monthly', day: existing };
        numInput.addEventListener('input', () => {
          const v = Math.min(31, Math.max(1, Number(numInput.value) || 1));
          currentRecurrence = { type: 'monthly', day: v };
        });
        return;
      }

      // weekly / nweekly — 요일 버튼 공통
      if (type === 'nweekly') {
        const existingN = currentRecurrence?.type === 'nweekly' ? currentRecurrence.n : 2;
        const nInput = subEl.createEl('input', {
          cls: 'planit-recurrence-num',
          attr: { type: 'number', min: '1', max: '52', value: String(existingN) },
        }) as HTMLInputElement;
        subEl.createSpan({ cls: 'planit-recurrence-unit', text: '주마다' });
        currentRecurrence = {
          type: 'nweekly',
          n: existingN,
          day: currentRecurrence?.type === 'nweekly' ? currentRecurrence.day : 1,
        };
        nInput.addEventListener('input', () => {
          const n = Math.min(52, Math.max(1, Number(nInput.value) || 1));
          currentRecurrence = { ...(currentRecurrence as { type: 'nweekly'; n: number; day: number }), n };
        });
      } else {
        // weekly
        currentRecurrence ??= { type: 'weekly', days: [1] };
        if (currentRecurrence.type !== 'weekly') currentRecurrence = { type: 'weekly', days: [1] };
      }

      const multiSelect = type === 'weekly';
      const initDays = new Set<number>(
        type === 'weekly'
          ? (currentRecurrence?.type === 'weekly' ? currentRecurrence.days : [1])
          : [(currentRecurrence as { type: 'nweekly'; n: number; day: number }).day],
      );

      const dayBtns = subEl.createDiv({ cls: 'planit-recurrence-days' });
      DAY_LABELS.forEach((label, i) => {
        const btn = dayBtns.createEl('button', { cls: 'planit-recurrence-day-btn', text: label });
        if (initDays.has(i)) btn.addClass('is-active');
        btn.addEventListener('click', () => {
          if (multiSelect) {
            if (initDays.has(i) && initDays.size > 1) initDays.delete(i);
            else initDays.add(i);
            currentRecurrence = { type: 'weekly', days: [...initDays].sort((a, b) => a - b) };
          } else {
            initDays.clear();
            initDays.add(i);
            currentRecurrence = {
              ...(currentRecurrence as { type: 'nweekly'; n: number; day: number }),
              day: i,
            };
          }
          dayBtns.querySelectorAll('.planit-recurrence-day-btn').forEach((b, idx) => {
            b.toggleClass('is-active', initDays.has(idx));
          });
        });
      });
    };

    typeSelect.addEventListener('change', renderSub);
    renderSub();

    contentEl.createEl('label', {
      text: '설명',
      cls: 'planit-edit-task-label planit-edit-task-label-block',
    });
    const descInput = contentEl.createEl('textarea', {
      cls: 'planit-edit-task-textarea',
      attr: { rows: '3', placeholder: '메모' },
    }) as HTMLTextAreaElement;
    descInput.value = this.task.description;

    const actions = contentEl.createDiv({ cls: 'planit-edit-task-actions' });
    const deleteBtn = actions.createEl('button', {
      text: '삭제',
      cls: 'planit-edit-task-delete',
    });
    const spacer = actions.createDiv({ cls: 'planit-edit-task-spacer' });
    spacer.style.flex = '1';
    const cancelBtn = actions.createEl('button', { text: '취소' });
    const saveBtn = actions.createEl('button', { text: '저장', cls: 'mod-cta' });

    let submitting = false;
    const submit = async (): Promise<void> => {
      if (submitting) return;
      const title = titleInput.value.trim();
      if (title === '') {
        titleInput.focus();
        return;
      }

      const startParsed = parseTimeInput(startInput.value);
      if (startParsed.kind === 'invalid') {
        new Notice('시작 시간 형식이 올바르지 않습니다 (HH:mm)');
        startInput.focus();
        return;
      }
      const endParsed = parseTimeInput(endInput.value);
      if (endParsed.kind === 'invalid') {
        new Notice('종료 시간 형식이 올바르지 않습니다 (HH:mm)');
        endInput.focus();
        return;
      }

      const patch = buildTaskPatch({
        title,
        date: dateInput.value === '' ? null : dateInput.value,
        start: startParsed.kind === 'ok' ? startParsed.value : null,
        end: endParsed.kind === 'ok' ? endParsed.value : null,
        listId: listSelect.value,
        priority: selectedPriority,
        description: descInput.value,
        tags: currentTags,
        recurrence: currentRecurrence,
      });

      submitting = true;
      try {
        await this.callbacks.onSave(patch);
      } finally {
        submitting = false;
      }
      this.close();
    };

    saveBtn.addEventListener('click', () => void submit());
    cancelBtn.addEventListener('click', () => this.close());
    let deleting = false;
    deleteBtn.addEventListener('click', async () => {
      if (deleting) return;
      deleting = true;
      try {
        await this.callbacks.onDelete();
      } finally {
        deleting = false;
      }
      this.close();
    });

    const handleEnter = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        void submit();
      }
    };
    titleInput.addEventListener('keydown', handleEnter);
    startInput.addEventListener('keydown', handleEnter);
    endInput.addEventListener('keydown', handleEnter);

    setTimeout(() => titleInput.focus(), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
