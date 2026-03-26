import { commonClient } from '../../utils/httpClients';

export const documentApi = {
  /**
   * Upload files. `files` is a FileList or array of File objects.
   * meta: { category, description, appointmentId, visibleTo: string[] }
   */
  upload: (files, meta = {}) => {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('files', file));
    if (meta.category) form.append('category', meta.category);
    if (meta.description) form.append('description', meta.description);
    if (meta.appointmentId) form.append('appointmentId', meta.appointmentId);
    if (meta.visibleTo?.length) form.append('visibleTo', JSON.stringify(meta.visibleTo));
    return commonClient.post('/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** List documents accessible to the current user (metadata only, no data field) */
  list: (params = {}) => commonClient.get('/documents', { params }),

  /**
   * Get a viewable object URL for the file (images, PDFs, etc.).
   * Returns a string URL that can be used directly in <img src> or <iframe src>.
   * Remember to call URL.revokeObjectURL(url) when done.
   */
  getViewUrl: async (id) => {
    const res = await commonClient.get(`/documents/${id}`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },

  /**
   * Trigger browser download of the file.
   */
  download: async (id, originalName) => {
    const res = await commonClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName || 'download';
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Delete the document (uploader/admin only) */
  remove: (id) => commonClient.delete(`/documents/${id}`),
};
