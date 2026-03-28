import { documentApi } from './document.api';

export const documentService = {
  upload: (files, meta) => documentApi.upload(files, meta).then((r) => r.data),
  list: (params) => documentApi.list(params).then((r) => r.data),
  getViewUrl: (id) => documentApi.getViewUrl(id),
  download: (id, originalName) => documentApi.download(id, originalName),
  remove: (id) => documentApi.remove(id).then((r) => r.data),
};
