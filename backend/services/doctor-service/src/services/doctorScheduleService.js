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

/**
 * Build weeklyAvailability array from legacy Doctor collection fields (if any).
 */
function weeklyFromLegacyRaw(raw) {
  if (!raw) return [];
  if (raw.weeklyAvailability?.length) {
    return raw.weeklyAvailability.map((w) => ({
      weekStartMonday: w.weekStartMonday,
      slots: Array.isArray(w.slots) ? w.slots : []
    }));
  }
  if (raw.schedule?.length) {
    return [{ weekStartMonday: mondayKeyForDate(new Date()), slots: [...raw.schedule] }];
  }
  return [];
}

/**
 * Read weekly slots for API responses. Uses DoctorSchedule if present; otherwise legacy BSON on Doctor (until migrated).
 */
async function getWeeklyAvailabilityForDoctorId(doctorObjectId) {
  const sched = await DoctorSchedule.findOne({ doctorId: doctorObjectId }).lean();
  if (sched) return sched.weeklyAvailability || [];

  const raw = await Doctor.collection.findOne(
    { _id: doctorObjectId },
    { projection: { weeklyAvailability: 1, schedule: 1 } }
  );
  return weeklyFromLegacyRaw(raw);
}

/**
 * Batch-attach weeklyAvailability to lean doctor rows (list view).
 */
async function attachWeeklyToDoctorsLean(doctors) {
  if (!doctors.length) return doctors.map((d) => ({ ...d, weeklyAvailability: [] }));

  const ids = doctors.map((d) => d._id);
  const scheduleDocs = await DoctorSchedule.find({ doctorId: { $in: ids } }).lean();
  const byId = new Map(scheduleDocs.map((s) => [s.doctorId.toString(), s.weeklyAvailability || []]));

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

/**
 * Load schedule doc or create from legacy Doctor fields, then strip legacy keys from Doctor.
 */
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

/**
 * Merge one week's slots into weeklyAvailability and save DoctorSchedule.
 */
async function saveWeekSlots(doctorObjectId, weekStartMonday, weekSlots) {
  const sched = await loadOrCreateScheduleDocument(doctorObjectId);
  const list = [...(sched.weeklyAvailability || [])];
  const idx = list.findIndex((w) => w.weekStartMonday === weekStartMonday);
  const entry = { weekStartMonday, slots: weekSlots };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  sched.weeklyAvailability = list;
  sched.markModified('weeklyAvailability');
  await sched.save();
  return sched;
}

async function deleteByDoctorId(doctorObjectId) {
  await DoctorSchedule.deleteMany({ doctorId: doctorObjectId });
}

module.exports = {
  getWeeklyAvailabilityForDoctorId,
  attachWeeklyToDoctorsLean,
  attachWeeklyToDoctorLean,
  loadOrCreateScheduleDocument,
  saveWeekSlots,
  deleteByDoctorId
};
