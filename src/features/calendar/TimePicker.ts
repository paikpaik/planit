import { t } from '../../i18n';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);     // 1–12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);   // 0, 5, 10, …, 55

function parseHHmm(val: string): { ampm: 'am' | 'pm'; h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(val.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  const ampm: 'am' | 'pm' = hh < 12 ? 'am' : 'pm';
  const h = hh % 12 === 0 ? 12 : hh % 12;
  const snapped = Math.min(55, Math.round(mm / 5) * 5);
  return { ampm, h, m: snapped };
}

function toHHmm(ampm: 'am' | 'pm', h: number, m: number): string {
  const hh = ampm === 'am' ? h % 12 : (h % 12) + 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function attachTimePicker(input: HTMLInputElement): () => void {
  let panel: HTMLDivElement | null = null;
  let selAmpm: 'am' | 'pm' = 'am';
  let selH = 12;
  let selM = 0;

  const close = (): void => {
    panel?.remove();
    panel = null;
  };

  const commit = (): void => {
    input.value = toHHmm(selAmpm, selH, selM);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const makeCol = <T>(
    items: T[],
    label: (v: T) => string,
    isActive: (v: T) => boolean,
    onPick: (v: T) => void,
  ): HTMLDivElement => {
    const col = document.createElement('div');
    col.className = 'planit-tp-col';
    items.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'planit-tp-item' + (isActive(item) ? ' is-active' : '');
      el.textContent = label(item);
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onPick(item);
        col.querySelectorAll<HTMLDivElement>('.planit-tp-item').forEach((el2, i) => {
          el2.classList.toggle('is-active', isActive(items[i]));
        });
        commit();
      });
      col.appendChild(el);
    });
    return col;
  };

  const open = (): void => {
    if (panel) return;

    const parsed = parseHHmm(input.value);
    if (parsed) { selAmpm = parsed.ampm; selH = parsed.h; selM = parsed.m; }
    else { selAmpm = 'am'; selH = 12; selM = 0; }

    panel = document.createElement('div');
    panel.className = 'planit-time-picker';
    panel.addEventListener('mousedown', (e) => e.preventDefault());

    const ampmValues: ('am' | 'pm')[] = ['am', 'pm'];
    panel.appendChild(makeCol(
      ampmValues,
      (v) => v === 'am' ? t('time.am') : t('time.pm'),
      (v) => v === selAmpm,
      (v) => { selAmpm = v; },
    ));
    panel.appendChild(makeCol(
      HOURS,
      (h) => String(h),
      (h) => h === selH,
      (h) => { selH = h; },
    ));
    panel.appendChild(makeCol(
      MINUTES,
      (m) => String(m).padStart(2, '0'),
      (m) => m === selM,
      (m) => { selM = m; },
    ));

    document.body.appendChild(panel);

    const rect = input.getBoundingClientRect();
    const PANEL_H = 220;
    panel.style.left = `${rect.left}px`;
    panel.style.top = window.innerHeight - rect.bottom >= PANEL_H
      ? `${rect.bottom + 4}px`
      : `${rect.top - PANEL_H - 4}px`;

    setTimeout(() => {
      panel?.querySelectorAll('.planit-tp-item.is-active').forEach((el) => {
        el.scrollIntoView({ block: 'center' });
      });
    }, 0);
  };

  const onFocus = (): void => open();
  const onBlur = (): void => { setTimeout(close, 150); };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (!panel) return;
    if (e.key === 'Escape' || e.key === 'Tab') {
      close();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  input.addEventListener('focus', onFocus);
  input.addEventListener('blur', onBlur);
  input.addEventListener('keydown', onKeyDown, { capture: true });

  return () => {
    input.removeEventListener('focus', onFocus);
    input.removeEventListener('blur', onBlur);
    input.removeEventListener('keydown', onKeyDown, { capture: true });
    close();
  };
}
