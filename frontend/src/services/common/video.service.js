import { videoApi } from './video.api';

export const videoService = {
  async fetchToken(channelName, role = 'publisher') {
    const { data } = await videoApi.getToken(channelName, role);
    return data; // { appId, token, channelName, uid, role, expiresAt }
  },
};
