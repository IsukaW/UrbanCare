import { doctorService } from '../services/doctor/doctor.service';

/**
 * Doctor document _id for GET/PATCH /doctors/:id when JWT carries both common User id and doctor profile id.
 */
export function getDoctorProfileId(user) {
  if (!user) return null;
  if (user._id && user.id && String(user._id) !== String(user.id)) {
    return String(user._id);
  }
  return user._id ? String(user._id) : user.id ? String(user.id) : null;
}

/**
 * Load doctor profile: by profile id, or by listing when session only has User id.
 */
export async function fetchDoctorProfileForSession(user) {
  const hint = getDoctorProfileId(user);
  if (!hint) return null;
  try {
    return await doctorService.getById(hint);
  } catch {
    // Session may only have common User id; resolve Doctor row by userId
  }
  const commonId = user.id ? String(user.id) : null;
  if (!commonId) return null;
  try {
    const list = await doctorService.list();
    const rows = Array.isArray(list) ? list : [];
    const row = rows.find((d) => d && String(d.userId) === commonId);
    if (!row?._id) return null;
    return await doctorService.getById(String(row._id));
  } catch {
    return null;
  }
}
