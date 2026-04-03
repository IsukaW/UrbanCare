/** Monday 00:00 local of the calendar week containing `d` (Mon–Sun grid). */
export function mondayOfWeekContaining(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Stable YYYY-MM-DD for a Monday date (local). */
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

/**
 * Slots for one calendar week only (not recurring).
 * Past weeks: returns saved slots for that week, or [].
 * Future / weeks never configured: [].
 * Legacy `profile.schedule` (recurring) only applies to the current week until migrated server-side.
 */
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
