import { commonClient } from '../../utils/httpClients';

export const documentApi = {
  // upload one or more files with optional metadata
  // files: FileList or File[]; meta: { category, description, appointmentId, visibleTo }
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

  // lists documents accessible to the current user (metadata only, no data field)
  list: (params = {}) => commonClient.get('/documents', { params }),

  // returns an object URL for inline viewing (images, PDFs, etc.)
  // call URL.revokeObjectURL(url) when done to free memory
  getViewUrl: async (id) => {
    const res = await commonClient.get(`/documents/${id}`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },

  // triggers a browser file download
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

  // deletes the document (uploader or admin only)
  remove: (id) => commonClient.delete(`/documents/${id}`),
};
