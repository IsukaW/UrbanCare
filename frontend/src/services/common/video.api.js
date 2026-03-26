import { commonClient } from '../../utils/httpClients';

export const videoApi = {
  getToken: (channelName, role = 'publisher') =>
    commonClient.post('/video/token', { channelName, role }),
};
