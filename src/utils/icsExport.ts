import type { CalendarDateEvent } from './ephemerisEngine';

function escapeIcsText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function toIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

function addOneDayIso(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

export function buildSolaris2027Ics(
  personName: string,
  events: readonly CalendarDateEvent[],
): string {
  const nowStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

  const safeName = escapeIcsText(personName.trim() || 'Solaris');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Solaris 2027//Matryca Solarna//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Solaris 2027 — ${safeName}`,
  ];

  for (const ev of events) {
    const prefix = ev.type === 'golden' ? '[ZŁOTE OKNO] ' : '[UWAGA] ';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(ev.id)}@solaris27.pl`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(ev.dateStart)}`,
      `DTEND;VALUE=DATE:${addOneDayIso(ev.dateEnd)}`,
      `SUMMARY:${escapeIcsText(prefix + ev.title)}`,
      `DESCRIPTION:${escapeIcsText(ev.summary + ' (Solaris 2027 — analiza matrycy solarnej)')}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function triggerIcsDownload(personName: string, events: readonly CalendarDateEvent[]): void {
  const icsContent = buildSolaris2027Ics(personName, events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `solaris-2027-kalendarz.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
