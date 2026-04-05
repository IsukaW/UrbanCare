/**
 * Mirrors doctor-service Joi `slotItemSchema` + request body `schedule` array.
 * Times must be HH:mm (24h), dayOfWeek 0–6 (same as Date#getDay: 0 = Sunday).
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidScheduleTime(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value.trim());
}

/**
 * @param {{ dayOfWeek: unknown, startTime: unknown, endTime: unknown }} s
 * @returns {{ dayOfWeek: number, startTime: string, endTime: string }}
 */
export function normalizeScheduleSlotForApi(s) {
  const dayOfWeek = Number(s.dayOfWeek);
  const startTime = String(s.startTime ?? '').trim();
  const endTime = String(s.endTime ?? '').trim();

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('Each slot needs dayOfWeek 0–6 (Sunday–Saturday).');
  }
  if (!isValidScheduleTime(startTime) || !isValidScheduleTime(endTime)) {
    throw new Error('Times must be HH:mm in 24-hour format (e.g. 09:00).');
  }

  return { dayOfWeek, startTime, endTime };
}

/**
 * @param {Array<{ dayOfWeek?: unknown, startTime?: unknown, endTime?: unknown }>} slots
 * @returns {Array<{ dayOfWeek: number, startTime: string, endTime: string }>}
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
    dayOfWeek: Number(s.dayOfWeek),
    startTime: String(s.startTime ?? '').trim(),
    endTime: String(s.endTime ?? '').trim(),
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
        Number.isInteger(s.dayOfWeek) &&
        s.dayOfWeek >= 0 &&
        s.dayOfWeek <= 6 &&
        isValidScheduleTime(s.startTime) &&
        isValidScheduleTime(s.endTime)
    );
}
