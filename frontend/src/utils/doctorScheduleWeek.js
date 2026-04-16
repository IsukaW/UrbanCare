// Returns Monday 00:00 local time for the calendar week containing d.
export function mondayOfWeekContaining(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Formats a Monday date as YYYY-MM-DD string (local time).
export function formatWeekStartMonday(mondayDate) {
  const x = new Date(mondayDate);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const d = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date, n) {
  const x = new Date(date.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

// Returns slots for one specific calendar week.
// Past/future weeks without saved data return [].
// Legacy recurring profile.schedule is only applied to the current week
// until it gets migrated server-side.
export function getSlotsForWeek(profile, mondayDate) {
  if (!profile) return [];
  const key = formatWeekStartMonday(mondayDate);
  const row = profile.weeklyAvailability?.find((w) => w.weekStartMonday === key);
  if (row) return row.slots ?? [];

  const hasWeekly = profile.weeklyAvailability && profile.weeklyAvailability.length > 0;
  if (!hasWeekly && profile.schedule?.length) {
    const cur = mondayOfWeekContaining(new Date());
    if (formatWeekStartMonday(cur) === key) {
      return profile.schedule;
    }
  }
  return [];
}
