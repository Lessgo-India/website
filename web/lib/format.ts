const EVENT_TYPE_LABEL: Record<string, string> = {
  HANGOUT: 'Hangout',
  TRIP: 'Trip',
  MEETING: 'Meeting',
  WORKSHOP: 'Workshop',
  PARTY: 'Party',
  SPORTS: 'Sports',
  GROUP_STUDY: 'Study',
  DINNER: 'Dinner',
  CONFERENCE: 'Conference',
  EVENT: 'Event',
  OTHER: 'Other',
};

export function eventTypeLabel(type?: string | null): string {
  if (!type) return 'Event';
  return EVENT_TYPE_LABEL[type] ?? 'Event';
}

const TZ = 'Asia/Kolkata';

export function formatEventWhen(start?: string | null, end?: string | null): string {
  if (!start) return '';
  try {
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return '';
    const full: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: TZ,
    };
    let out = new Intl.DateTimeFormat('en-IN', full).format(startDate);
    if (end) {
      const endDate = new Date(end);
      if (!Number.isNaN(endDate.getTime())) {
        const sameDay = startDate.toDateString() === endDate.toDateString();
        const endOpts: Intl.DateTimeFormatOptions = sameDay
          ? { hour: 'numeric', minute: '2-digit', timeZone: TZ }
          : full;
        out += ' – ' + new Intl.DateTimeFormat('en-IN', endOpts).format(endDate);
      }
    }
    return out;
  } catch {
    return '';
  }
}

export function isPast(end?: string | null, start?: string | null): boolean {
  const ref = end || start;
  if (!ref) return false;
  const t = new Date(ref).getTime();
  return !Number.isNaN(t) && t < Date.now();
}
