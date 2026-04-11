const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidScheduleTime(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value.trim());
}

export function isValidScheduleDate(value) {
  return typeof value === 'string' && DATE_PATTERN.test(value.trim());
}

/**
 * @param {{ date: unknown, startTime: unknown, endTime: unknown }} s
 * @returns {{ date: string, startTime: string, endTime: string }}
 */
export function normalizeScheduleSlotForApi(s) {
  const date = String(s.date ?? '').trim();
  const startTime = String(s.startTime ?? '').trim();
  const endTime = String(s.endTime ?? '').trim();
  const slotId = s.slotId ? String(s.slotId).trim() : undefined;
  const maxTokens = Number.isInteger(s.maxTokens) ? s.maxTokens : undefined;

  if (!isValidScheduleDate(date)) {
    throw new Error('Each slot needs a valid date in YYYY-MM-DD format.');
  }
  if (!isValidScheduleTime(startTime) || !isValidScheduleTime(endTime)) {
    throw new Error('Times must be HH:mm in 24-hour format (e.g. 09:00).');
  }

  return {
    ...(slotId ? { slotId } : {}),
    date,
    startTime,
    endTime,
    ...(maxTokens ? { maxTokens } : {})
  };
}

/**
 * @param {Array<{ date?: unknown, startTime?: unknown, endTime?: unknown }>} slots
 * @returns {Array<{ date: string, startTime: string, endTime: string }>}
 */
export function normalizeScheduleArrayForApi(slots) {
  if (!Array.isArray(slots)) return [];
  return slots.map(normalizeScheduleSlotForApi);
}

/**
 * Coerce API / Mongo lean shapes for UI (string numbers, etc.).
 */
export function coerceSlotFromProfile(s) {
  if (!s || typeof s !== 'object') return null;
  return {
    slotId: s.slotId ? String(s.slotId).trim() : undefined,
    date: String(s.date ?? '').trim(),
    startTime: String(s.startTime ?? '').trim(),
    endTime: String(s.endTime ?? '').trim(),
    maxTokens: Number.isInteger(s.maxTokens) ? s.maxTokens : undefined,
    reservedTokens: Number.isInteger(s.reservedTokens) ? s.reservedTokens : undefined,
    availableTokens: Number.isInteger(s.availableTokens) ? s.availableTokens : undefined,
  };
}

/** Slots from `weeklyAvailability[].slots` or legacy `schedule` for grid display. */
export function slotsFromProfileForUi(slots) {
  if (!Array.isArray(slots)) return [];
  return slots
    .map(coerceSlotFromProfile)
    .filter(
      (s) =>
        s &&
        isValidScheduleDate(s.date) &&
        isValidScheduleTime(s.startTime) &&
        isValidScheduleTime(s.endTime)
    );
}
