const mongoose = require('mongoose');

/**
 * Document model — stores metadata for uploaded files.
 *
 * Access rules (enforced at the controller level):
 *  - The uploader always has full access (read + delete).
 *  - Admin always has full access.
 *  - Any userId listed in `visibleTo` can read (download) the document.
 *
 * Use-case examples:
 *  - Patient uploads a lab report → shares with their doctor via `visibleTo`.
 *  - Doctor uploads a prescription for a patient → adds patient's userId to `visibleTo`.
 *  - Both parties can view the document when linked to the same appointment.
 */
const documentSchema = new mongoose.Schema(
  {
    // Who uploaded the file
    uploadedBy: {
      userId: { type: String, required: true, index: true },
      role: { type: String, enum: ['admin', 'doctor', 'patient'], required: true },
    },

    // File content stored as base64-encoded string
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true }, // bytes (original)
    data: { type: String, required: true }, // base64-encoded file content

    // Semantic info
    category: {
      type: String,
      enum: ['prescription', 'lab_report', 'medical_record', 'certificate', 'imaging', 'other'],
      default: 'other',
    },
    description: { type: String, trim: true, maxlength: 500, default: '' },

    // Optional link to an appointment (helps both parties filter docs per visit)
    appointmentId: { type: String, default: null, index: true },

    // Optional link to a doctor profile (used for profile photos and doctor-specific docs)
    linkedDoctorId: { type: String, default: null, index: true },

    // Other users who may read/download this document (besides the uploader + admin)
    visibleTo: {
      type: [String], // array of userIds
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index: quickly find all docs a given user can access (excluding data field)
documentSchema.index({ 'uploadedBy.userId': 1, createdAt: -1 });
documentSchema.index({ visibleTo: 1, createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
