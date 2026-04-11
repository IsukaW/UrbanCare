const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const Doctor = require('../models/Doctor');
const DoctorSchedule = require('../models/DoctorSchedule');

function mondayKeyForDate(d) {
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  mon.setDate(mon.getDate() + offset);
  mon.setHours(0, 0, 0, 0);
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  const dd = String(mon.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function normalizeSlot(slot) {
  const normalized = {
    slotId: slot.slotId || new mongoose.Types.ObjectId().toString(),
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    maxTokens: Number.isInteger(slot.maxTokens) ? slot.maxTokens : 20,
    reservedTokens: Math.max(0, Number.isInteger(slot.reservedTokens) ? slot.reservedTokens : 0)
  };
  normalized.reservedTokens = Math.min(normalized.maxTokens, normalized.reservedTokens);
  normalized.availableTokens = Math.max(0, normalized.maxTokens - normalized.reservedTokens);
  return normalized;
}

function normalizeWeekEntry(entry) {
  return {
    weekStartMonday: entry.weekStartMonday,
    slots: Array.isArray(entry.slots) ? entry.slots.map(normalizeSlot) : []
  };
}

function weeklyFromLegacyRaw(raw) {
  if (!raw) return [];
  if (raw.weeklyAvailability?.length) {
    return raw.weeklyAvailability.map((w) => normalizeWeekEntry({ weekStartMonday: w.weekStartMonday, slots: w.slots }));
  }
  if (raw.schedule?.length) {
    return [normalizeWeekEntry({ weekStartMonday: mondayKeyForDate(new Date()), slots: raw.schedule })];
  }
  return [];
}

function filterWeeklyAvailability(weeklyAvailability, predicate) {
  return weeklyAvailability
    .map((entry) => ({
      weekStartMonday: entry.weekStartMonday,
      slots: (entry.slots || []).filter(predicate).map((slot) => ({
        ...slot,
        availableTokens: Math.max(0, slot.maxTokens - slot.reservedTokens)
      }))
    }))
    .filter((entry) => entry.slots.length > 0);
}

function selectWeeklyAvailability(weeklyAvailability, weekStartMonday) {
  if (!weekStartMonday) return weeklyAvailability;
  return weeklyAvailability.filter((entry) => entry.weekStartMonday === weekStartMonday);
}

async function getWeeklyAvailabilityForDoctorId(doctorObjectId) {
  const sched = await DoctorSchedule.findOne({ doctorId: doctorObjectId }).lean();
  if (sched) return (sched.weeklyAvailability || []).map(normalizeWeekEntry);

  const raw = await Doctor.collection.findOne(
    { _id: doctorObjectId },
    { projection: { weeklyAvailability: 1, schedule: 1 } }
  );
  return weeklyFromLegacyRaw(raw);
}

async function getAvailableSlotsForDoctorId(doctorObjectId, weekStartMonday = null) {
  const weeklyAvailability = await getWeeklyAvailabilityForDoctorId(doctorObjectId);
  const selected = selectWeeklyAvailability(weeklyAvailability, weekStartMonday);
  return filterWeeklyAvailability(selected, (slot) => slot.maxTokens - slot.reservedTokens > 0);
}

async function getReservedSlotsForDoctorId(doctorObjectId, weekStartMonday = null) {
  const weeklyAvailability = await getWeeklyAvailabilityForDoctorId(doctorObjectId);
  const selected = selectWeeklyAvailability(weeklyAvailability, weekStartMonday);
  return filterWeeklyAvailability(selected, (slot) => slot.reservedTokens > 0);
}

async function attachWeeklyToDoctorsLean(doctors) {
  if (!doctors.length) return doctors.map((d) => ({ ...d, weeklyAvailability: [] }));

  const ids = doctors.map((d) => d._id);
  const scheduleDocs = await DoctorSchedule.find({ doctorId: { $in: ids } }).lean();
  const byId = new Map(scheduleDocs.map((s) => [s.doctorId.toString(), (s.weeklyAvailability || []).map(normalizeWeekEntry)]));

  const missingIds = ids.filter((id) => !byId.has(id.toString()));
  if (missingIds.length) {
    const raws = await Doctor.collection
      .find({ _id: { $in: missingIds } }, { projection: { weeklyAvailability: 1, schedule: 1 } })
      .toArray();
    const rawById = new Map(raws.map((r) => [r._id.toString(), r]));
    for (const oid of missingIds) {
      const raw = rawById.get(oid.toString());
      byId.set(oid.toString(), weeklyFromLegacyRaw(raw));
    }
  }

  return doctors.map((d) => ({
    ...d,
    weeklyAvailability: byId.get(d._id.toString()) ?? []
  }));
}

async function attachWeeklyToDoctorLean(doctorLean) {
  if (!doctorLean?._id) return { ...doctorLean, weeklyAvailability: [] };
  const weekly = await getWeeklyAvailabilityForDoctorId(doctorLean._id);
  return { ...doctorLean, weeklyAvailability: weekly };
}

async function loadOrCreateScheduleDocument(doctorObjectId) {
  let sched = await DoctorSchedule.findOne({ doctorId: doctorObjectId });
  if (sched) return sched;

  const raw = await Doctor.collection.findOne(
    { _id: doctorObjectId },
    { projection: { weeklyAvailability: 1, schedule: 1 } }
  );
  const weekly = weeklyFromLegacyRaw(raw);
  const hadLegacy = !!(raw?.weeklyAvailability?.length || raw?.schedule?.length);

  sched = await DoctorSchedule.create({
    doctorId: doctorObjectId,
    weeklyAvailability: weekly
  });

  if (hadLegacy) {
    await Doctor.collection.updateOne({ _id: doctorObjectId }, { $unset: { weeklyAvailability: '', schedule: '' } });
  }

  return sched;
}

function mergeSlot(existingSlots, incomingSlot) {
  const key = `${incomingSlot.date}|${incomingSlot.startTime}|${incomingSlot.endTime}`;
  const existingById = new Map(existingSlots.filter((s) => s.slotId).map((s) => [s.slotId, s]));
  const existingByKey = new Map(existingSlots.map((s) => [`${s.date}|${s.startTime}|${s.endTime}`, s]));
  const matched = incomingSlot.slotId ? existingById.get(incomingSlot.slotId) : existingByKey.get(key);
  const normalized = normalizeSlot(incomingSlot);

  if (matched) {
    return {
      ...matched,
      ...normalized,
      slotId: matched.slotId,
      reservedTokens: Math.min(normalized.maxTokens, matched.reservedTokens)
    };
  }

  return normalized;
}

async function saveWeekSlots(doctorObjectId, weekStartMonday, weekSlots) {
  const sched = await loadOrCreateScheduleDocument(doctorObjectId);
  const list = [...(sched.weeklyAvailability || [])];
  const idx = list.findIndex((w) => w.weekStartMonday === weekStartMonday);
  const existingSlots = idx >= 0 ? list[idx].slots : [];
  const slots = Array.isArray(weekSlots)
    ? weekSlots.map((slot) => mergeSlot(existingSlots, slot))
    : [];

  const entry = { weekStartMonday, slots };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);

  sched.weeklyAvailability = list;
  sched.markModified('weeklyAvailability');
  await sched.save();
  return sched;
}

async function findSlot(doctorObjectId, slotId) {
  const sched = await loadOrCreateScheduleDocument(doctorObjectId);
  for (const entry of sched.weeklyAvailability || []) {
    const slot = (entry.slots || []).find((s) => s.slotId === slotId);
    if (slot) {
      return { schedule: sched, entry, slot };
    }
  }
  return null;
}

async function reserveSlotToken(doctorObjectId, slotId) {
  const found = await findSlot(doctorObjectId, slotId);
  if (!found) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Slot not found');
  }

  const { schedule, slot, entry } = found;
  if (slot.reservedTokens >= slot.maxTokens) {
    throw new ApiError(StatusCodes.CONFLICT, 'Slot is fully reserved');
  }

  slot.reservedTokens += 1;
  schedule.markModified('weeklyAvailability');
  await schedule.save();

  return {
    doctorId: doctorObjectId.toString(),
    weekStartMonday: entry.weekStartMonday,
    slotId: slot.slotId,
    tokenNumber: slot.reservedTokens,
    maxTokens: slot.maxTokens,
    reservedTokens: slot.reservedTokens,
    availableTokens: Math.max(0, slot.maxTokens - slot.reservedTokens)
  };
}

async function releaseSlotToken(doctorObjectId, slotId) {
  const found = await findSlot(doctorObjectId, slotId);
  if (!found) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Slot not found');
  }

  const { schedule, slot, entry } = found;
  if (slot.reservedTokens <= 0) {
    throw new ApiError(StatusCodes.CONFLICT, 'No reserved tokens to release');
  }

  slot.reservedTokens -= 1;
  schedule.markModified('weeklyAvailability');
  await schedule.save();

  return {
    doctorId: doctorObjectId.toString(),
    weekStartMonday: entry.weekStartMonday,
    slotId: slot.slotId,
    reservedTokens: slot.reservedTokens,
    availableTokens: Math.max(0, slot.maxTokens - slot.reservedTokens)
  };
}

async function deleteByDoctorId(doctorObjectId) {
  await DoctorSchedule.deleteMany({ doctorId: doctorObjectId });
}

module.exports = {
  getWeeklyAvailabilityForDoctorId,
  getAvailableSlotsForDoctorId,
  getReservedSlotsForDoctorId,
  attachWeeklyToDoctorsLean,
  attachWeeklyToDoctorLean,
  loadOrCreateScheduleDocument,
  saveWeekSlots,
  reserveSlotToken,
  releaseSlotToken,
  deleteByDoctorId
};
