import { doctorService } from '../services/doctor/doctor.service';

function normId(v) {
  if (v == null) return '';
  return String(v).trim();
}

/**
 * Doctor document _id for GET/PATCH /doctors/:id when JWT carries both common User id and doctor profile id.
 */
export function getDoctorProfileId(user) {
  if (!user) return null;
  const id = normId(user.id);
  const docId = normId(user._id);
  if (docId && id && docId !== id) {
    return docId;
  }
  return docId || id || null;
}

/**
 * Load doctor profile for the logged-in common-service user.
 * Prefer resolving by Doctor.userId === session user id (stable after login without doctor _id on the client).
 */
export async function fetchDoctorProfileForSession(user) {
  if (!user) return null;

  const commonUserId = normId(user.id);
  if (commonUserId) {
    try {
      const list = await doctorService.list();
      const rows = Array.isArray(list) ? list : [];
      const row = rows.find((d) => d && normId(d.userId) === commonUserId);
      if (row?._id) {
        return await doctorService.getById(String(row._id));
      }
    } catch {
      // fall through to doctor-document-id hint
    }
  }

  const hint = user._id ? normId(user._id) : null;
  if (!hint || hint === commonUserId) {
    return null;
  }

  try {
    return await doctorService.getById(hint);
  } catch {
    return null;
  }
}
